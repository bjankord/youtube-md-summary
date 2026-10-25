/** Reads `YYYY-MM-DD` from the `"publishDate"` field embedded in a YouTube watch page. */
export function extractPublishDate(html: string): string | undefined {
  return html.match(/"publishDate":"(\d{4}-\d{2}-\d{2})/)?.[1];
}
