import { UserError } from "./errors.js";

const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;

/** Extracts the video ID from a `www.youtube.com/watch?v=` or `www.youtube.com/shorts/` URL. */
export function parseVideoUrl(input: string): string {
  const id = extractId(input);
  if (!id || !VIDEO_ID.test(id)) {
    throw new UserError(
      `Unsupported URL: ${input}\n` +
        "Use https://www.youtube.com/watch?v=<id> or https://www.youtube.com/shorts/<id>",
    );
  }
  return id;
}

function extractId(input: string): string | null {
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" || url.hostname !== "www.youtube.com") return null;
  if (url.pathname === "/watch") return url.searchParams.get("v");
  return url.pathname.match(/^\/shorts\/([^/]+)$/)?.[1] ?? null;
}
