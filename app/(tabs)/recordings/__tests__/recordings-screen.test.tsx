/**
 * Recordings screen tests
 * - Framework verification
 * - Utility function tests
 */

import { describe, it, expect } from "vitest";
import { formatDate, getDurationLabel, getTranscribedLabel } from "../hooks/utils";

// ─── Framework ───────────────────────────────────────────────

describe("vitest framework", () => {
  it("basic assertions work", () => {
    expect(1 + 1).toBe(2);
    expect({ a: 1 }).toEqual({ a: 1 });
    expect("hello").toContain("ell");
  });
});

// ─── formatDate ─────────────────────────────────────────────

describe("formatDate", () => {
  it("formats ISO string to Japanese locale format", () => {
    const result = formatDate("2026-06-12T10:30:00Z");
    expect(result).toContain("6月");
    expect(result).toContain("12");
  });

  it("handles different dates", () => {
    const result = formatDate("2025-01-01T00:00:00Z");
    expect(result).toContain("1月");
    expect(result).toContain("1");
  });

  it("handles edge case dates", () => {
    const result = formatDate("2024-12-31T10:00:00Z");
    expect(result).toContain("12月");
    expect(result).toContain("31");
  });
});

// ─── getDurationLabel ─────────────────────────────────────────

describe("getDurationLabel", () => {
  it("returns '0秒' for zero or negative", () => {
    expect(getDurationLabel(0)).toBe("0秒");
    expect(getDurationLabel(-5)).toBe("0秒");
  });

  it("returns seconds only for under 60", () => {
    expect(getDurationLabel(45)).toBe("45秒");
    expect(getDurationLabel(1)).toBe("1秒");
    expect(getDurationLabel(59)).toBe("59秒");
  });

  it("returns minutes and seconds for under 3600", () => {
    expect(getDurationLabel(125)).toBe("2m 5s");
    expect(getDurationLabel(60)).toBe("1m 0s");
    expect(getDurationLabel(3660)).toContain("1h");
  });

  it("returns hours and minutes for 3600+", () => {
    expect(getDurationLabel(3661)).toBe("1h 1m");
    expect(getDurationLabel(7200)).toBe("2h 0m");
    expect(getDurationLabel(3660)).toBe("1h 1m");
  });
});

// ─── getTranscribedLabel ──────────────────────────────────────

describe("getTranscribedLabel", () => {
  it('returns "完了" for true', () => {
    expect(getTranscribedLabel(true)).toBe("完了");
  });

  it('returns "未" for false', () => {
    expect(getTranscribedLabel(false)).toBe("未");
  });
});
