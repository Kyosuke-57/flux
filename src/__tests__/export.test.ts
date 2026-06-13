import { describe, it, expect, vi, beforeEach } from "vitest";
import { contentToPlainText, contentToHtml } from "../services/export";

// ─── Mock native modules ────────────────────────────────────

vi.mock("expo-file-system", () => ({
  Paths: { cache: "/tmp/cache" },
  File: vi.fn(() => ({ uri: "file:///tmp/test.txt", write: vi.fn() })),
}));

vi.mock("expo-sharing", () => ({
  default: { shareAsync: vi.fn() },
  isAvailableAsync: vi.fn().mockResolvedValue(true),
  shareAsync: vi.fn(),
}));

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
