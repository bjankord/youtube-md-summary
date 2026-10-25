const MAX_SLUG_LENGTH = 60;

export interface FilenameParts {
  publishDate?: string;
  title: string;
  videoId: string;
}

/** `<publishDate>-<title-slug>-<videoId>.md`, leaving out the date or slug when unavailable. */
export function buildFilename({ publishDate, title, videoId }: FilenameParts): string {
  return [publishDate, slugify(title), videoId].filter(Boolean).join("-") + ".md";
}

function slugify(title: string): string {
  const slug = title
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  if (slug.length <= MAX_SLUG_LENGTH) return slug;
  if (slug[MAX_SLUG_LENGTH] === "-") return slug.slice(0, MAX_SLUG_LENGTH);
  const lastBreak = slug.lastIndexOf("-", MAX_SLUG_LENGTH);
  return lastBreak > 0 ? slug.slice(0, lastBreak) : slug.slice(0, MAX_SLUG_LENGTH);
}
