import { stat, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { parseArgs } from "node:util";
import { buildFilename } from "./buildFilename.js";
import { UserError } from "./errors.js";
import { findExistingSummary } from "./findExistingSummary.js";
import { parseVideoUrl } from "./parseVideoUrl.js";
import { renderMarkdown } from "./renderMarkdown.js";
import { resolveApiKey } from "./resolveApiKey.js";

export const DEFAULT_MODEL = "gemini-3.8-flash";

export interface VideoTranscript {
  title: string;
  channel: string;
  publishDate?: string;
  lengthSeconds: number;
  transcript: string;
}

export interface SummarizeInput {
  transcript: string;
  title: string;
  lengthSeconds: number;
  model: string;
  apiKey: string;
  /** Progress messages (e.g. retries) for the user. */
  log(line: string): void;
}

export interface Summary {
  summary: string;
  keyPoints: string[];
}

export interface RunDeps {
  fetchTranscript(videoId: string): Promise<VideoTranscript>;
  summarize(input: SummarizeInput): Promise<Summary>;
  env: Record<string, string | undefined>;
  cwd: string;
  now(): Date;
  version: string;
  stdout(line: string): void;
  stderr(line: string): void;
}

export const USAGE = `Usage: yt-md-summary <url> [--dir <path>] [--force] [--model <id>]

Summarizes a YouTube video's transcript into a markdown file using Google Gemini.

Arguments:
  <url>           https://www.youtube.com/watch?v=<id> or https://www.youtube.com/shorts/<id>

Options:
  --dir <path>    Existing directory to write the summary into (default: current directory)
  --force         Write even if a summary for this video already exists in --dir
  --model <id>    Gemini model to use (default: ${DEFAULT_MODEL})
  -h, --help      Show this help
  -v, --version   Show the version

Environment:
  GEMINI_API_KEY  Gemini API key (GOOGLE_API_KEY is used if GEMINI_API_KEY is not set)`;

/** Runs the CLI and returns its exit code. */
export async function run(argv: string[], deps: RunDeps): Promise<number> {
  try {
    return await runOrThrow(argv, deps);
  } catch (error) {
    if (error instanceof UserError || isParseArgsError(error)) {
      deps.stderr(`Error: ${error.message}`);
      return 1;
    }
    throw error;
  }
}

async function runOrThrow(argv: string[], deps: RunDeps): Promise<number> {
  const { values, positionals } = parseArgs({
    args: argv,
    allowPositionals: true,
    options: {
      dir: { type: "string" },
      force: { type: "boolean", default: false },
      model: { type: "string", default: DEFAULT_MODEL },
      help: { type: "boolean", short: "h", default: false },
      version: { type: "boolean", short: "v", default: false },
    },
  });
  if (values.help) {
    deps.stdout(USAGE);
    return 0;
  }
  if (values.version) {
    deps.stdout(deps.version);
    return 0;
  }
  const url = positionals[0];
  if (!url) throw new UserError(`Missing YouTube URL.\n\n${USAGE}`);
  const videoId = parseVideoUrl(url);
  const dir = resolve(deps.cwd, values.dir ?? ".");
  await assertDirectory(dir);
  const apiKey = resolveApiKey(deps.env);
  if (!values.force) {
    const existing = await findExistingSummary(dir, videoId);
    if (existing) {
      throw new UserError(`A summary for this video already exists: ${resolve(dir, existing)}\nUse --force to write a new one anyway.`);
    }
  }
  const { model } = values;

  deps.stderr(`Fetching transcript for ${videoId}…`);
  const video = await deps.fetchTranscript(videoId);
  if (!video.publishDate) {
    deps.stderr("Warning: could not find the video's publish date; leaving it out of the filename.");
  }
  deps.stderr(`Summarizing with ${model}…`);
  const summary = await deps.summarize({
    transcript: video.transcript,
    title: video.title,
    lengthSeconds: video.lengthSeconds,
    model,
    apiKey,
    log: deps.stderr,
  });

  const file = resolve(dir, buildFilename({ publishDate: video.publishDate, title: video.title, videoId }));
  await writeFile(
    file,
    renderMarkdown({
      title: video.title,
      url,
      videoId,
      channel: video.channel,
      published: video.publishDate,
      summarized: localDate(deps.now()),
      model,
      ...summary,
    }),
  );
  deps.stdout(file);
  return 0;
}

async function assertDirectory(dir: string): Promise<void> {
  const stats = await stat(dir).catch(() => undefined);
  if (!stats) throw new UserError(`Directory does not exist: ${dir}`);
  if (!stats.isDirectory()) throw new UserError(`Not a directory: ${dir}`);
}

function isParseArgsError(error: unknown): error is Error {
  return error instanceof Error && "code" in error && String(error.code).startsWith("ERR_PARSE_ARGS_");
}

function localDate(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}
