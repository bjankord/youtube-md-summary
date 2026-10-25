import {
  fetchTranscript as fetchYoutubeTranscript,
  type FetchParams,
  YoutubeTranscriptDisabledError,
  YoutubeTranscriptInvalidVideoIdError,
  YoutubeTranscriptNotAvailableError,
  YoutubeTranscriptTooManyRequestError,
  YoutubeTranscriptVideoUnavailableError,
} from "youtube-transcript-plus";
import { UserError } from "./errors.js";
import { extractPublishDate } from "./extractPublishDate.js";
import type { VideoTranscript } from "./run.js";

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36";

/** Fetches the default caption track plus video details, reading the publish date from the watch page the library already downloads. */
export async function fetchTranscript(videoId: string): Promise<VideoTranscript> {
  let publishDate: string | undefined;

  const videoFetch = async ({ url, lang, userAgent, signal }: FetchParams): Promise<Response> => {
    const response = await fetch(url, {
      headers: { "User-Agent": userAgent ?? USER_AGENT, ...(lang && { "Accept-Language": lang }) },
      signal,
    });
    if (response.ok) publishDate = extractPublishDate(await response.clone().text());
    return response;
  };

  try {
    const { videoDetails, segments } = await fetchYoutubeTranscript(videoId, {
      videoDetails: true,
      videoFetch,
      userAgent: USER_AGENT,
      retries: 3,
    });
    return {
      title: videoDetails.title,
      channel: videoDetails.author,
      publishDate,
      lengthSeconds: Number(videoDetails.lengthSeconds),
      transcript: segments.map((segment) => decodeEntities(segment.text)).join(" "),
    };
  } catch (error) {
    throw toUserError(error) ?? error;
  }
}

function toUserError(error: unknown): UserError | undefined {
  if (error instanceof YoutubeTranscriptDisabledError || error instanceof YoutubeTranscriptNotAvailableError) {
    return new UserError("This video has no captions available.");
  }
  if (error instanceof YoutubeTranscriptVideoUnavailableError) {
    return new UserError("This video is unavailable (it may be private, removed or region-locked).");
  }
  if (error instanceof YoutubeTranscriptInvalidVideoIdError) {
    return new UserError("YouTube rejected the video ID.");
  }
  if (error instanceof YoutubeTranscriptTooManyRequestError) {
    return new UserError("YouTube is rate-limiting requests from this machine. Try again later.");
  }
  return undefined;
}

/** Caption text arrives HTML-escaped (sometimes twice, e.g. `&amp;#39;`). */
function decodeEntities(text: string): string {
  let decoded = text;
  for (let i = 0; i < 2; i++) {
    decoded = decoded
      .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
      .replace(/&quot;/g, '"')
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&amp;/g, "&");
  }
  return decoded;
}
