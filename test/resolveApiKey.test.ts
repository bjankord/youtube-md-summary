import { describe, expect, it } from "vitest";
import { resolveApiKey } from "../src/resolveApiKey.js";

describe("resolveApiKey", () => {
  it("uses GEMINI_API_KEY", () => {
    expect(resolveApiKey({ GEMINI_API_KEY: "gemini-key" })).toBe("gemini-key");
  });

  it("falls back to GOOGLE_API_KEY", () => {
    expect(resolveApiKey({ GOOGLE_API_KEY: "google-key" })).toBe("google-key");
  });

  it("prefers GEMINI_API_KEY when both are set", () => {
    expect(resolveApiKey({ GEMINI_API_KEY: "gemini-key", GOOGLE_API_KEY: "google-key" })).toBe("gemini-key");
  });

  it("treats blank values as unset", () => {
    expect(resolveApiKey({ GEMINI_API_KEY: "  ", GOOGLE_API_KEY: "google-key" })).toBe("google-key");
  });

  it("names both variables and AI Studio when neither is set", () => {
    expect(() => resolveApiKey({})).toThrow(/GEMINI_API_KEY.*GOOGLE_API_KEY[\s\S]*aistudio\.google\.com/);
  });
});
