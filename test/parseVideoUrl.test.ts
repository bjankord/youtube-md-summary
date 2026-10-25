import { describe, expect, it } from "vitest";
import { parseVideoUrl } from "../src/parseVideoUrl.js";

describe("parseVideoUrl", () => {
  it("returns the video ID from a watch URL", () => {
    expect(parseVideoUrl("https://www.youtube.com/watch?v=h9be6jbKaJo")).toBe("h9be6jbKaJo");
  });

  it("returns the video ID from a shorts URL", () => {
    expect(parseVideoUrl("https://www.youtube.com/shorts/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
  });
});

describe("parseVideoUrl rejects unsupported URLs", () => {
  it.each([
    "https://youtu.be/h9be6jbKaJo",
    "https://youtube.com/watch?v=h9be6jbKaJo",
    "https://m.youtube.com/watch?v=h9be6jbKaJo",
    "http://www.youtube.com/watch?v=h9be6jbKaJo",
    "h9be6jbKaJo",
    "https://www.youtube.com/watch?v=tooShort",
    "https://www.youtube.com/watch?v=h9be6jbKaJoXX",
    "https://www.youtube.com/shorts/h9be6jbKaJo/extra",
    "https://www.youtube.com/embed/h9be6jbKaJo",
    "https://www.youtube.com/watch",
    "not a url",
  ])("%s", (input) => {
    expect(() => parseVideoUrl(input)).toThrow(/Unsupported URL/);
  });

  it("names both accepted formats in the error", () => {
    expect(() => parseVideoUrl("https://youtu.be/h9be6jbKaJo")).toThrow(
      /youtube\.com\/watch\?v=.*youtube\.com\/shorts\//s,
    );
  });
});

describe("parseVideoUrl ignores extra query params", () => {
  it.each([
    ["https://www.youtube.com/watch?v=h9be6jbKaJo&t=42s", "h9be6jbKaJo"],
    ["https://www.youtube.com/watch?list=PL123&v=h9be6jbKaJo", "h9be6jbKaJo"],
    ["https://www.youtube.com/shorts/dQw4w9WgXcQ?si=abc", "dQw4w9WgXcQ"],
  ])("%s", (input, id) => {
    expect(parseVideoUrl(input)).toBe(id);
  });
});
