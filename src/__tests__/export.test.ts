import { describe, it, expect, vi, beforeEach } from "vitest";
import { contentToPlainText, contentToHtml, exportMinuteToFile, shareExportedFile, exportAndShareMinute } from "../services/export";
import { File, Paths } from "expo-file-system";
import { printToFileAsync } from "expo-print";
import { isAvailableAsync, shareAsync } from "expo-sharing";

// ─── Mock helpers (hoisted so vi.mock factories can reference them) ──

const { mockFileWrite } = vi.hoisted(() => ({
  mockFileWrite: vi.fn(),
}));

// ─── Mock native modules ────────────────────────────────────

vi.mock("expo-file-system", () => ({
  Paths: { cache: "/tmp/cache" },
  File: vi.fn(function () {
    return { uri: "file:///tmp/test.txt", write: mockFileWrite };
  }),
}));

vi.mock("expo-sharing", () => ({
  default: { shareAsync: vi.fn() },
  isAvailableAsync: vi.fn().mockResolvedValue(true),
  shareAsync: vi.fn(),
}));

vi.mock("expo-print", () => ({
  printToFileAsync: vi.fn().mockResolvedValue({ uri: "file:///tmp/test.pdf" }),
}));

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(isAvailableAsync).mockResolvedValue(true);
});

// ─── contentToPlainText ─────────────────────────────────────

describe("contentToPlainText", () => {
  it("removes markdown heading markers", () => {
    expect(contentToPlainText("# Title")).toBe("Title");
    expect(contentToPlainText("## Subtitle")).toBe("Subtitle");
    expect(contentToPlainText("### Section")).toBe("Section");
  });

  it("removes bold/italic markers", () => {
    expect(contentToPlainText("**bold** and *italic*")).toBe("bold and italic");
  });

  it("removes code backtick markers", () => {
    expect(contentToPlainText("`code` here")).toBe("code here");
  });

  it("collapses excessive newlines", () => {
    const input = "Line1\n\n\n\nLine2";
    expect(contentToPlainText(input)).toBe("Line1\n\nLine2");
  });

  it("trims whitespace", () => {
    expect(contentToPlainText("  hello  ")).toBe("hello");
  });

  it("handles empty string", () => {
    expect(contentToPlainText("")).toBe("");
  });

  it("handles mixed markdown", () => {
    const input = "# Title\n**bold** and `code`\n\n\nMore";
    expect(contentToPlainText(input)).toBe("Title\nbold and code\n\nMore");
  });
});

// ─── contentToHtml ──────────────────────────────────────────

describe("contentToHtml", () => {
  it("wraps title in h1", () => {
    const html = contentToHtml("Test Title", "Body text");
    expect(html).toContain("<h1>Test Title</h1>");
  });

  it("converts # heading to h1", () => {
    const html = contentToHtml("Title", "# Heading");
    expect(html).toContain("<h1>Heading</h1>");
  });

  it("converts ## heading to h2", () => {
    const html = contentToHtml("Title", "## Subheading");
    expect(html).toContain("<h2>Subheading</h2>");
  });

  it("converts ### heading to h3", () => {
    const html = contentToHtml("Title", "### Sub-subheading");
    expect(html).toContain("<h3>Sub-subheading</h3>");
  });

  it("wraps plain text in p tags", () => {
    const html = contentToHtml("Title", "Hello world");
    expect(html).toContain("<p>Hello world</p>");
  });

  it("adds br for empty lines", () => {
    const html = contentToHtml("Title", "Line1\n\nLine2");
    expect(html).toContain("<br/>");
  });

  it("escapes HTML in title", () => {
    const html = contentToHtml("Title <script>alert('xss')</script>", "Body");
    expect(html).toContain("&lt;script&gt;");
    expect(html).not.toContain("<script>");
  });

  it("includes DOCTYPE and html structure", () => {
    const html = contentToHtml("Title", "Content");
    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("<html lang=\"ja\">");
    expect(html).toContain("</html>");
  });

  it("includes meta date", () => {
    const html = contentToHtml("Title", "Content");
    expect(html).toContain("作成日:");
  });

  it("handles empty content", () => {
    const html = contentToHtml("Title", "");
    expect(html).toContain("<h1>Title</h1>");
  });

  it("handles multiline content correctly", () => {
    const content = "# Meeting Notes\nSome important points.\n\n## Action Items\n- Do X\n- Do Y";
    const html = contentToHtml("Big Meeting", content);
    expect(html).toContain("<h1>Meeting Notes</h1>");
    expect(html).toContain("<p>Some important points.</p>");
    expect(html).toContain("<h2>Action Items</h2>");
    expect(html).toContain("<p>- Do X</p>");
  });
});

// ─── exportMinuteToFile ─────────────────────────────────────

describe("exportMinuteToFile", () => {
  const sampleMinute = {
    id: "1",
    user_id: "u1",
    title: "Test Meeting",
    content: "*Hello* **world**",
    tags: [] as string[],
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  };

  const txtResult = { uri: "file:///tmp/test.txt", mimeType: "text/plain" };
  const mdResult = { uri: "file:///tmp/test.txt", mimeType: "text/markdown" };
  const pdfResult = { uri: "file:///tmp/test.pdf", mimeType: "application/pdf" };

  it("exports as txt - writes plain text and returns correct result", async () => {
    const result = await exportMinuteToFile(sampleMinute, "txt");

    expect(result).toEqual(txtResult);
    expect(File).toHaveBeenCalledWith(Paths.cache, expect.stringMatching(/Test Meeting-\d+\.txt/));
    expect(mockFileWrite).toHaveBeenCalledWith("Test Meeting\n\nHello world");
  });

  it("exports as md - writes raw markdown and returns correct result", async () => {
    const result = await exportMinuteToFile(sampleMinute, "md");

    expect(result).toEqual(mdResult);
    expect(File).toHaveBeenCalledWith(Paths.cache, expect.stringMatching(/Test Meeting-\d+\.md/));
    expect(mockFileWrite).toHaveBeenCalledWith("# Test Meeting\n\n*Hello* **world**");
  });

  it("exports as pdf - calls printToFileAsync with html", async () => {
    const result = await exportMinuteToFile(sampleMinute, "pdf");

    expect(result).toEqual(pdfResult);
    expect(printToFileAsync).toHaveBeenCalledTimes(1);
    const { html } = (printToFileAsync as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(html).toContain("Test Meeting");
    expect(html).toContain("<!DOCTYPE html>");
  });

  it("sanitizes special characters in title for filename", async () => {
    const minute = { ...sampleMinute, title: "foo/bar:baz" };
    await exportMinuteToFile(minute, "txt");

    expect(File).toHaveBeenCalledWith(Paths.cache, expect.stringMatching(/foo_bar_baz-\d+\.txt/));
  });

  it("truncates long title to 60 chars", async () => {
    const minute = { ...sampleMinute, title: "a".repeat(100) };
    await exportMinuteToFile(minute, "txt");

    const callArg = (File as unknown as ReturnType<typeof vi.fn>).mock.calls[0][1] as string;
    const namePart = callArg.split("-")[0];
    expect(namePart.length).toBeLessThanOrEqual(60);
  });

  it("pdf format does not call File constructor", async () => {
    await exportMinuteToFile(sampleMinute, "pdf");

    expect(File).not.toHaveBeenCalled();
  });

  it("treats unknown format as txt fallback", async () => {
    const result = await exportMinuteToFile(sampleMinute, "doc" as "txt");
    expect(result.mimeType).toBe("text/plain");
    expect(File).toHaveBeenCalledWith(Paths.cache, expect.stringMatching(/\.doc$/));
  });
});

// ─── shareExportedFile ──────────────────────────────────────

describe("shareExportedFile", () => {
  it("calls shareAsync with uri, mimeType and default title", async () => {
    await shareExportedFile("file:///test.txt", "text/plain");

    expect(isAvailableAsync).toHaveBeenCalledTimes(1);
    expect(shareAsync).toHaveBeenCalledWith("file:///test.txt", {
      mimeType: "text/plain",
      dialogTitle: "議事録を共有",
    });
  });

  it("accepts custom dialogTitle", async () => {
    await shareExportedFile("file:///test.pdf", "application/pdf", "シェア");

    expect(shareAsync).toHaveBeenCalledWith("file:///test.pdf", {
      mimeType: "application/pdf",
      dialogTitle: "シェア",
    });
  });

  it("throws when sharing is not available", async () => {
    (isAvailableAsync as ReturnType<typeof vi.fn>).mockResolvedValue(false);

    await expect(
      shareExportedFile("file:///test.txt", "text/plain"),
    ).rejects.toThrow("このデバイスでは共有が利用できません。");

    expect(shareAsync).not.toHaveBeenCalled();
  });
});

// ─── exportAndShareMinute ───────────────────────────────────

describe("exportAndShareMinute", () => {
  const sampleMinute = {
    id: "1",
    user_id: "u1",
    title: "Test Meeting",
    content: "*Hello* **world**",
    tags: [] as string[],
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  };

  it("exports txt then shares with correct params", async () => {
    await exportAndShareMinute(sampleMinute, "txt");

    expect(File).toHaveBeenCalledWith(Paths.cache, expect.stringMatching(/\.txt$/));
    expect(shareAsync).toHaveBeenCalledWith(
      "file:///tmp/test.txt",
      { mimeType: "text/plain", dialogTitle: "議事録を共有" },
    );
  });

  it("exports md then shares with correct params", async () => {
    await exportAndShareMinute(sampleMinute, "md");

    expect(File).toHaveBeenCalledWith(Paths.cache, expect.stringMatching(/\.md$/));
    expect(shareAsync).toHaveBeenCalledWith(
      "file:///tmp/test.txt",
      { mimeType: "text/markdown", dialogTitle: "議事録を共有" },
    );
  });

  it("exports pdf then shares with correct params", async () => {
    await exportAndShareMinute(sampleMinute, "pdf");

    expect(printToFileAsync).toHaveBeenCalledTimes(1);
    expect(shareAsync).toHaveBeenCalledWith(
      "file:///tmp/test.pdf",
      { mimeType: "application/pdf", dialogTitle: "議事録を共有" },
    );
  });

  it("propagates error from exportMinuteToFile (does not call share)", async () => {
    (printToFileAsync as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("PDF fail"));

    await expect(
      exportAndShareMinute(sampleMinute, "pdf"),
    ).rejects.toThrow("PDF fail");

    expect(shareAsync).not.toHaveBeenCalled();
  });
});
