import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ----- hoisted mock functions -----
const mockGetSession = vi.hoisted(() => vi.fn());

// ----- module mocks (same pattern as removeHallucinations.test.ts) -----
vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({
    auth: {
      getSession: mockGetSession,
    },
  })),
}));

vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
  },
}));

vi.mock("react-native-url-polyfill/auto", () => ({}));

// ----- imports (after vi.mock — vitest hoists them) -----
import { uploadToR2 } from "../../src/services/r2-upload";

// ----- shared test values -----
const validParams = {
  uri: "file:///tmp/test.mp3",
  filename: "test.mp3",
  mimeType: "audio/mpeg",
  fileSize: 12345,
};

const mockUploadUrl = "https://r2.example.com/upload/test-key-abc123";
const mockR2Key = "test-key-abc123";

// ----- helpers -----

interface XHRBehavior {
  /** Which callback fires when send() is called. */
  trigger: "load" | "error" | "timeout";
  /** The HTTP status visible inside onload. */
  status: number;
  /** The responseText visible inside onload. */
  responseText: string;
  /**
   * Progress percentages to report before the final trigger.
   * Each value is passed as `{ loaded: <value>, total: 100 }`.
   */
  progressValues?: number[];
}

/**
 * Stub XMLHttpRequest globally with a mock that fires the desired callback
 * asynchronously when send() is called. If progressValues are provided, fires
 * xhr.upload.onprogress for each value before the final trigger.
 */
function stubXHR(behavior?: Partial<XHRBehavior>): Record<string, any> {
  const b: XHRBehavior = {
    trigger: "load",
    status: 200,
    responseText: "",
    ...behavior,
  };

  const xhr: Record<string, any> = {
    upload: {},
    status: 0,
    responseText: b.responseText,
    readyState: 4,
    open: vi.fn(),
    setRequestHeader: vi.fn(),
    abort: vi.fn(),
    onload: null,
    onerror: null,
    ontimeout: null,
    send: vi.fn().mockImplementation(function () {
      // Copy behavior-dependent properties onto xhr
      xhr.status = b.status;
      xhr.responseText = b.responseText;

      // Fire progress callbacks before the final trigger
      if (b.progressValues && xhr.upload.onprogress) {
        for (const pct of b.progressValues) {
          xhr.upload.onprogress({
            lengthComputable: true,
            loaded: pct,
            total: 100,
          });
        }
      }

      // Fire the final trigger asynchronously
      queueMicrotask(() => {
        const handler = xhr[`on${b.trigger}`] as Function | null;
        if (handler) handler.call(xhr);
      });
    }),
  };

  (globalThis as any).XMLHttpRequest = function () {
    return xhr;
  };
  return xhr;
}

function stubFetch(overrides?: Record<string, any>): void {
  (globalThis as any).fetch = vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: () =>
      Promise.resolve({ uploadUrl: mockUploadUrl, r2Key: mockR2Key }),
    text: () => Promise.resolve(""),
    ...overrides,
  });
}

// ----- tests -----

describe("uploadToR2", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSession.mockResolvedValue({
      data: { session: { access_token: "test-access-token" } },
    });
    stubFetch();
    stubXHR();
  });

  afterEach(() => {
    delete (globalThis as any).XMLHttpRequest;
    delete (globalThis as any).fetch;
  });

  // ---- export ----

  it("exports uploadToR2 as a function", () => {
    expect(uploadToR2).toBeInstanceOf(Function);
  });

  // ---- auth errors ----

  it("throws when user is not authenticated", async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });
    await expect(uploadToR2(validParams)).rejects.toThrow("認証されていません");
  });

  // ---- fetch errors ----

  it("throws when fetch returns non-ok status", async () => {
    stubFetch({
      ok: false,
      status: 500,
      text: () => Promise.resolve("Internal Server Error"),
    });
    await expect(uploadToR2(validParams)).rejects.toThrow(
      "アップロードURLの取得に失敗しました",
    );
  });

  it("throws when response is missing uploadUrl", async () => {
    stubFetch({ json: () => Promise.resolve({ r2Key: mockR2Key }) });
    await expect(uploadToR2(validParams)).rejects.toThrow(
      "アップロードURLのレスポンスが不正です",
    );
  });

  it("throws when response is missing r2Key", async () => {
    stubFetch({ json: () => Promise.resolve({ uploadUrl: mockUploadUrl }) });
    await expect(uploadToR2(validParams)).rejects.toThrow(
      "アップロードURLのレスポンスが不正です",
    );
  });

  // ---- happy path ----

  it("uploads successfully and returns r2Key", async () => {
    const result = await uploadToR2(validParams);
    expect(result).toEqual({ r2Key: mockR2Key });
  });

  it("sends correct request to the upload URL endpoint", async () => {
    await uploadToR2(validParams);

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/flux-upload-url"),
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer test-access-token",
          "Content-Type": "application/json",
        }),
        body: expect.stringContaining("test.mp3"),
      }),
    );
  });

  it("configures XHR with the signed URL and file data", async () => {
    const xhr = stubXHR();
    await uploadToR2(validParams);

    expect(xhr.open).toHaveBeenCalledWith("PUT", mockUploadUrl);
    expect(xhr.setRequestHeader).toHaveBeenCalledWith(
      "Content-Type",
      validParams.mimeType,
    );
    expect(xhr.send).toHaveBeenCalledWith(
      expect.objectContaining({
        uri: validParams.uri,
        type: validParams.mimeType,
        name: validParams.filename,
      }),
    );
  });

  // ---- XHR errors ----

  it("throws on XHR error response (non-2xx status)", async () => {
    stubXHR({ status: 500, responseText: "Upload failed" });
    await expect(uploadToR2(validParams)).rejects.toThrow(
      "R2 アップロードに失敗しました",
    );
  });

  it("throws on network error", async () => {
    stubXHR({ trigger: "error" });
    await expect(uploadToR2(validParams)).rejects.toThrow("ネットワークエラー");
  });

  it("throws on timeout", async () => {
    stubXHR({ trigger: "timeout" });
    await expect(uploadToR2(validParams)).rejects.toThrow("アップロードがタイムアウト");
  });

  // ---- progress reporting ----

  it("reports upload progress via callback", async () => {
    const onProgress = vi.fn();
    stubXHR({ progressValues: [25, 75] });
    await uploadToR2(validParams, onProgress);

    expect(onProgress).toHaveBeenCalledTimes(3);
    expect(onProgress).toHaveBeenNthCalledWith(1, 25);
    expect(onProgress).toHaveBeenNthCalledWith(2, 75);
    expect(onProgress).toHaveBeenNthCalledWith(3, 100);
  });

  it("skips non-computable progress events", async () => {
    const onProgress = vi.fn();
    const xhr = stubXHR({});
    const promise = uploadToR2(validParams, onProgress);

    // Manually fire a non-computable progress event before the microtask
    const progressFn = xhr.upload.onprogress as Function;
    if (progressFn) {
      progressFn({ lengthComputable: false, loaded: 50, total: 100 });
    }

    await promise;

    // Only the 100% from onload should be reported
    expect(onProgress).toHaveBeenCalledTimes(1);
    expect(onProgress).toHaveBeenCalledWith(100);
  });

  it("does not throw when no progress callback is provided", async () => {
    stubXHR({ progressValues: [50] });
    await expect(uploadToR2(validParams)).resolves.toEqual({
      r2Key: mockR2Key,
    });
  });
});
