import { describe, expect, it } from "vitest";
import { renderMarkdown, type SummaryDocument } from "../src/renderMarkdown.js";

const doc: SummaryDocument = {
  title: "How Transformers Work",
  url: "https://www.youtube.com/watch?v=h9be6jbKaJo",
  videoId: "h9be6jbKaJo",
  channel: "Some Channel",
  published: "2024-05-01",
  summarized: "2026-10-25",
  model: "gemini-3.8-flash",
  summary: "First paragraph.\n\nSecond paragraph.",
  keyPoints: ["Point one", "Point two"],
};

describe("renderMarkdown", () => {
  it("renders frontmatter, summary and key points", () => {
    expect(renderMarkdown(doc)).toBe(`---
title: "How Transformers Work"
url: "https://www.youtube.com/watch?v=h9be6jbKaJo"
videoId: "h9be6jbKaJo"
channel: "Some Channel"
published: 2024-05-01
summarized: 2026-10-25
model: "gemini-3.8-flash"
---

# How Transformers Work

## Summary

First paragraph.

Second paragraph.

## Key Points

- Point one
- Point two
`);
  });

  it("omits published when the publish date is unknown", () => {
    const { published, ...rest } = doc;
    const md = renderMarkdown(rest);
    expect(md).not.toContain("published:");
    expect(md).toContain('channel: "Some Channel"\nsummarized: 2026-10-25\n');
  });

  it("escapes quotes and backslashes in frontmatter strings", () => {
    const md = renderMarkdown({ ...doc, title: 'The "Best" C:\\ Tips', channel: "Bob's: Channel" });
    expect(md).toContain('title: "The \\"Best\\" C:\\\\ Tips"\n');
    expect(md).toContain('channel: "Bob\'s: Channel"\n');
    expect(md).toContain('# The "Best" C:\\ Tips\n');
  });
});
