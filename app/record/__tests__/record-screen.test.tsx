/**
 * record-screen のテスト
 * - フレームワークの動作確認
 */

import { describe, it, expect } from "vitest";

describe("vitest フレームワーク", () => {
  it("基本的なアサーションが動作する", () => {
    expect(Array.isArray([1, 2, 3])).toBe(true);
    expect("テスト").toBeTruthy();
    expect(Object.keys({ a: 1, b: 2 })).toHaveLength(2);
  });
});
