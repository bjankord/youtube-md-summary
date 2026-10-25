import { describe, expect, it } from "vitest";
import { extractPublishDate } from "../src/extractPublishDate.js";

describe("extractPublishDate", () => {
  it("reads the date part of an ISO publishDate without timezone conversion", () => {
    const html = `<script>var ytInitialPlayerResponse = {"microformat":{"playerMicroformatRenderer":{"publishDate":"2024-05-01T23:30:00-07:00","uploadDate":"2024-04-30T10:00:00-07:00"}}};</script>`;
    expect(extractPublishDate(html)).toBe("2024-05-01");
  });

  it("reads a date-only publishDate", () => {
    expect(extractPublishDate(`{"publishDate":"2019-12-31"}`)).toBe("2019-12-31");
  });

  it("returns undefined when the page has no publishDate", () => {
    expect(extractPublishDate("<html><body>Nothing here</body></html>")).toBeUndefined();
  });
});
