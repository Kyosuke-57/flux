import { describe, it, expect, vi, beforeEach } from "vitest";

// ----- hoisted mock functions (available to vi.mock factories) -----
const mockSignUp = vi.hoisted(() => vi.fn());
const mockSignInWithPassword = vi.hoisted(() => vi.fn());
const mockSignOut = vi.hoisted(() => vi.fn());
const mockSignInWithOAuth = vi.hoisted(() => vi.fn());
const mockGetUser = vi.hoisted(() => vi.fn());
const mockGetSession = vi.hoisted(() => vi.fn());
const mockOnAuthStateChange = vi.hoisted(() => vi.fn());

const mockOpenAuthSessionAsync = vi.hoisted(() => vi.fn());
const mockCreateURL = vi.hoisted(() => vi.fn());

// ----- module mocks (same pattern as removeHallucinations.test.ts) -----
vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({
    auth: {
      signUp: mockSignUp,
      signInWithPassword: mockSignInWithPassword,
      signOut: mockSignOut,
      signInWithOAuth: mockSignInWithOAuth,
      getUser: mockGetUser,
      getSession: mockGetSession,
      onAuthStateChange: mockOnAuthStateChange,
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

vi.mock("expo-web-browser", () => ({
  maybeCompleteAuthSession: vi.fn(),
  openAuthSessionAsync: mockOpenAuthSessionAsync,
}));

vi.mock("expo-linking", () => ({
  createURL: mockCreateURL,
}));

// ----- imports (after vi.mock — vitest hoists them) -----
import {
  signUp,
  signIn,
  signOut,
  signInWithGoogle,
  getCurrentUser,
  getSession,
  onAuthStateChange,
} from "../../src/services/auth";

// ----- tests -----
describe("auth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("signUp", () => {
    it("calls supabase.auth.signUp with email/password and returns data", async () => {
      const expected = { data: { user: { id: "u1" } }, error: null };
      mockSignUp.mockResolvedValue(expected);

      const result = await signUp("a@b.com", "secret");

      expect(mockSignUp).toHaveBeenCalledWith({
        email: "a@b.com",
        password: "secret",
      });
      expect(result).toEqual(expected);
    });

    it("returns error when signUp fails", async () => {
      const err = new Error("signup failed");
      mockSignUp.mockResolvedValue({ data: null, error: err });

      const result = await signUp("a@b.com", "secret");

      expect(result).toEqual({ data: null, error: err });
    });
  });

  describe("signIn", () => {
    it("calls supabase.auth.signInWithPassword and returns data", async () => {
      const expected = { data: { user: { id: "u1" } }, error: null };
      mockSignInWithPassword.mockResolvedValue(expected);

      const result = await signIn("a@b.com", "secret");

      expect(mockSignInWithPassword).toHaveBeenCalledWith({
        email: "a@b.com",
        password: "secret",
      });
      expect(result).toEqual(expected);
    });

    it("returns error when signIn fails", async () => {
      const err = new Error("invalid credentials");
      mockSignInWithPassword.mockResolvedValue({ data: null, error: err });

      const result = await signIn("a@b.com", "wrong");

      expect(result).toEqual({ data: null, error: err });
    });
  });

  describe("signOut", () => {
    it("calls supabase.auth.signOut and returns no error", async () => {
      mockSignOut.mockResolvedValue({ error: null });

      const result = await signOut();

      expect(mockSignOut).toHaveBeenCalledOnce();
      expect(result).toEqual({ error: null });
    });

    it("returns error when signOut fails", async () => {
      const err = new Error("sign out failed");
      mockSignOut.mockResolvedValue({ error: err });

      const result = await signOut();

      expect(result).toEqual({ error: err });
    });
  });

  describe("signInWithGoogle", () => {
    const redirectUri = "exp://test-redirect";
    const oauthUrl = "https://accounts.google.com/oauth";

    it("returns data on successful OAuth flow", async () => {
      mockCreateURL.mockReturnValue(redirectUri);
      mockSignInWithOAuth.mockResolvedValue({
        data: { url: oauthUrl },
        error: null,
      });
      mockOpenAuthSessionAsync.mockResolvedValue({ type: "success" });

      const result = await signInWithGoogle();

      expect(mockCreateURL).toHaveBeenCalledWith("auth/callback");
      expect(mockSignInWithOAuth).toHaveBeenCalledWith({
        provider: "google",
        options: {
          redirectTo: redirectUri,
          queryParams: { access_type: "offline", prompt: "consent" },
        },
      });
      expect(mockOpenAuthSessionAsync).toHaveBeenCalledWith(
        oauthUrl,
        redirectUri,
      );
      expect(result).toEqual({ data: { url: oauthUrl }, error: null });
    });

    it("returns error when signInWithOAuth fails", async () => {
      const err = new Error("provider error");
      mockSignInWithOAuth.mockResolvedValue({ data: null, error: err });

      const result = await signInWithGoogle();

      expect(mockOpenAuthSessionAsync).not.toHaveBeenCalled();
      expect(result).toEqual({ data: null, error: err });
    });

    it("returns error when no OAuth URL is returned", async () => {
      mockSignInWithOAuth.mockResolvedValue({
        data: { url: null },
        error: null,
      });

      const result = await signInWithGoogle();

      expect(mockOpenAuthSessionAsync).not.toHaveBeenCalled();
      expect(result.data).toBeNull();
      expect(result.error?.message).toContain("no OAuth URL returned");
    });

    it("returns cancelled error when user cancels the browser flow", async () => {
      mockCreateURL.mockReturnValue(redirectUri);
      mockSignInWithOAuth.mockResolvedValue({
        data: { url: oauthUrl },
        error: null,
      });
      mockOpenAuthSessionAsync.mockResolvedValue({ type: "cancel" });

      const result = await signInWithGoogle();

      expect(result.data).toBeNull();
      expect(result.error?.message).toBe("Google sign in was cancelled");
    });
  });

  describe("getCurrentUser", () => {
    it("returns user when authenticated", async () => {
      const user = { id: "u1", email: "a@b.com" };
      mockGetUser.mockResolvedValue({ data: { user }, error: null });

      const result = await getCurrentUser();

      expect(mockGetUser).toHaveBeenCalledOnce();
      expect(result).toEqual({ user, error: null });
    });

    it("returns null user when not authenticated", async () => {
      mockGetUser.mockResolvedValue({ data: { user: null }, error: null });

      const result = await getCurrentUser();

      expect(result).toEqual({ user: null, error: null });
    });

    it("returns error when getUser fails", async () => {
      const err = new Error("network error");
      mockGetUser.mockResolvedValue({ data: { user: null }, error: err });

      const result = await getCurrentUser();

      expect(result.user).toBeNull();
      expect(result.error).toBe(err);
    });
  });

  describe("getSession", () => {
    it("returns session when active", async () => {
      const session = { access_token: "tok", user: { id: "u1" } };
      mockGetSession.mockResolvedValue({ data: { session }, error: null });

      const result = await getSession();

      expect(mockGetSession).toHaveBeenCalledOnce();
      expect(result).toEqual({ session, error: null });
    });

    it("returns null session when not signed in", async () => {
      mockGetSession.mockResolvedValue({ data: { session: null }, error: null });

      const result = await getSession();

      expect(result).toEqual({ session: null, error: null });
    });
  });

  describe("onAuthStateChange", () => {
    beforeEach(() => {
      mockOnAuthStateChange.mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } },
      });
    });

    it("calls supabase.auth.onAuthStateChange with a listener", () => {
      const callback = vi.fn();
      const sub = onAuthStateChange(callback);

      expect(mockOnAuthStateChange).toHaveBeenCalledOnce();
      // the first argument is the listener function
      expect(mockOnAuthStateChange.mock.calls[0][0]).toBeInstanceOf(Function);
      expect(sub).toHaveProperty("data.subscription");
    });

    it("forwards auth state events to the callback", () => {
      const callback = vi.fn();
      onAuthStateChange(callback);

      const listener = mockOnAuthStateChange.mock.calls[0][0];
      listener("SIGNED_IN", { user: { id: "u1" } });

      expect(callback).toHaveBeenCalledWith("SIGNED_IN", {
        user: { id: "u1" },
      });
    });
  });
});
