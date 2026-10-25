export interface SummaryDocument {
  title: string;
  url: string;
  videoId: string;
  channel: string;
  published?: string;
  summarized: string;
  model: string;
  summary: string;
  keyPoints: string[];
}

/** JSON string literals are valid YAML double-quoted scalars. */
const quote = (value: string) => JSON.stringify(value);

export function renderMarkdown(doc: SummaryDocument): string {
  const frontmatter = [
    `title: ${quote(doc.title)}`,
    `url: ${quote(doc.url)}`,
    `videoId: ${quote(doc.videoId)}`,
    `channel: ${quote(doc.channel)}`,
    ...(doc.published ? [`published: ${doc.published}`] : []),
    `summarized: ${doc.summarized}`,
    `model: ${quote(doc.model)}`,
  ];
  return [
    "---",
    ...frontmatter,
    "---",
    "",
    `# ${doc.title}`,
    "",
    "## Summary",
    "",
    doc.summary.trim(),
    "",
    "## Key Points",
    "",
    ...doc.keyPoints.map((point) => `- ${point}`),
    "",
  ].join("\n");
}
