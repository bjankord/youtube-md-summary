import { describe, expect, it } from "vitest";
import { buildFilename } from "../src/buildFilename.js";

describe("buildFilename", () => {
  it("joins publish date, title slug and video ID", () => {
    expect(
      buildFilename({ publishDate: "2024-05-01", title: "How Transformers Work!", videoId: "h9be6jbKaJo" }),
    ).toBe("2024-05-01-how-transformers-work-h9be6jbKaJo.md");
  });
});

describe("buildFilename omits missing parts", () => {
  it("omits the date when the publish date is unknown", () => {
    expect(buildFilename({ title: "How Transformers Work", videoId: "h9be6jbKaJo" })).toBe(
      "how-transformers-work-h9be6jbKaJo.md",
    );
  });

  it("omits the slug when the title has no ASCII letters or digits", () => {
    expect(buildFilename({ publishDate: "2024-05-01", title: "日本語のタイトル", videoId: "h9be6jbKaJo" })).toBe(
      "2024-05-01-h9be6jbKaJo.md",
    );
  });
});

describe("buildFilename slug rules", () => {
  it("truncates long titles to at most 60 characters at a word boundary", () => {
    const title = "The Complete Beginner's Guide to Building Command Line Tools with Node and TypeScript";
    expect(buildFilename({ title, videoId: "h9be6jbKaJo" })).toBe(
      "the-complete-beginner-s-guide-to-building-command-line-tools-h9be6jbKaJo.md",
    );
  });

  it("hard-cuts a single word longer than 60 characters", () => {
    const title = "a".repeat(70);
    expect(buildFilename({ title, videoId: "h9be6jbKaJo" })).toBe(`${"a".repeat(60)}-h9be6jbKaJo.md`);
  });

  it("folds accented letters to ASCII", () => {
    expect(buildFilename({ title: "Café Crème Brûlée", videoId: "h9be6jbKaJo" })).toBe(
      "cafe-creme-brulee-h9be6jbKaJo.md",
    );
  });
});
