import { describe, expect, it } from "vitest";
import { joinPageText } from "./noteText";

describe("joinPageText", () => {
  it("joins page text with newlines", () => {
    expect(joinPageText(["Mitochondria make ATP.", "Osmosis moves water."])).toEqual({
      text: "Mitochondria make ATP.\nOsmosis moves water.",
      truncated: false,
    });
  });

  it("keeps empty pages as blank lines", () => {
    expect(joinPageText(["First", "", "Third"]).text).toBe("First\n\nThird");
  });

  it("truncates to the given length and reports it", () => {
    const pages = ["abcdefghij", "klmnopqrst"];
    const result = joinPageText(pages, 12);
    expect(result.truncated).toBe(true);
    expect(result.text).toBe("abcdefghij\nk");
    expect(result.text.length).toBe(12);
  });

  it("does not truncate when the joined text is exactly the limit", () => {
    const result = joinPageText(["abcd", "ef"], 7);
    expect(result).toEqual({ text: "abcd\nef", truncated: false });
  });
});
