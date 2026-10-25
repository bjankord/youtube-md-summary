import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { run, type RunDeps } from "../src/run.js";

const URL = "https://www.youtube.com/watch?v=h9be6jbKaJo";

let dir: string;
let out: string[];
let err: string[];

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "yt-md-summary-"));
  out = [];
  err = [];
});
afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

function makeDeps(overrides: Partial<RunDeps> = {}): RunDeps {
  return {
    fetchTranscript: vi.fn(async () => ({
      title: "How Transformers Work",
      channel: "Some Channel",
      publishDate: "2024-05-01",
      lengthSeconds: 600,
      transcript: "hello world",
    })),
    summarize: vi.fn(async () => ({ summary: "A summary.", keyPoints: ["One", "Two"] })),
    env: { GEMINI_API_KEY: "test-key" },
    cwd: dir,
    now: () => new Date(2026, 9, 25, 12),
    version: "1.2.3",
    stdout: (line) => out.push(line),
    stderr: (line) => err.push(line),
    ...overrides,
  };
}

describe("run: pre-flight checks fail before any network call", () => {
  async function expectPreflightFailure(argv: string[], message: RegExp, overrides: Partial<RunDeps> = {}) {
    const deps = makeDeps(overrides);
    expect(await run(argv, deps)).toBe(1);
    expect(err.join("\n")).toMatch(message);
    expect(out).toEqual([]);
    expect(deps.fetchTranscript).not.toHaveBeenCalled();
    expect(deps.summarize).not.toHaveBeenCalled();
  }

  it("fails when --dir does not exist", async () => {
    await expectPreflightFailure([URL, "--dir", join(dir, "missing")], /Directory does not exist: .*missing/);
  });

  it("fails when --dir is a file", async () => {
    const file = join(dir, "not-a-dir.txt");
    await writeFile(file, "");
    await expectPreflightFailure([URL, "--dir", file], /Not a directory: .*not-a-dir\.txt/);
  });

  it("fails on an unsupported URL", async () => {
    await expectPreflightFailure(["https://youtu.be/h9be6jbKaJo", "--dir", dir], /Unsupported URL/);
  });

  it("fails when no URL is given", async () => {
    await expectPreflightFailure(["--dir", dir], /Missing YouTube URL[\s\S]*Usage:/);
  });

  it("fails on an unknown option", async () => {
    await expectPreflightFailure([URL, "--dri", dir], /--dri/);
  });

  it("fails when no API key is set", async () => {
    await expectPreflightFailure([URL, "--dir", dir], /GEMINI_API_KEY/, { env: {} });
  });

  it("checks the URL before the directory, and the directory before the API key", async () => {
    await expectPreflightFailure(["https://youtu.be/x", "--dir", join(dir, "missing")], /Unsupported URL/, {
      env: {},
    });
    err = [];
    await expectPreflightFailure([URL, "--dir", join(dir, "missing")], /Directory does not exist/, { env: {} });
  });
});

describe("run: existing summaries", () => {
  it("fails and names the existing file before any network call", async () => {
    await writeFile(join(dir, "2023-01-01-old-title-h9be6jbKaJo.md"), "old");
    const deps = makeDeps();

    expect(await run([URL, "--dir", dir], deps)).toBe(1);
    expect(err.join("\n")).toMatch(/2023-01-01-old-title-h9be6jbKaJo\.md[\s\S]*--force/);
    expect(deps.fetchTranscript).not.toHaveBeenCalled();
  });

  it("with --force, keeps the old file and writes the new one beside it", async () => {
    await writeFile(join(dir, "2023-01-01-old-title-h9be6jbKaJo.md"), "old");

    expect(await run([URL, "--dir", dir, "--force"], makeDeps())).toBe(0);
    expect((await readdir(dir)).sort()).toEqual([
      "2023-01-01-old-title-h9be6jbKaJo.md",
      "2024-05-01-how-transformers-work-h9be6jbKaJo.md",
    ]);
  });

  it("with --force, overwrites a file with the identical name", async () => {
    const file = join(dir, "2024-05-01-how-transformers-work-h9be6jbKaJo.md");
    await writeFile(file, "old");

    expect(await run([URL, "--dir", dir, "--force"], makeDeps())).toBe(0);
    expect(await readFile(file, "utf8")).toContain("## Summary");
  });
});

describe("run: options and messages", () => {
  it("defaults --dir to the current directory", async () => {
    expect(await run([URL], makeDeps())).toBe(0);
    expect(out).toEqual([join(dir, "2024-05-01-how-transformers-work-h9be6jbKaJo.md")]);
  });

  it("uses --model for the summary and records it in the frontmatter", async () => {
    const deps = makeDeps();
    expect(await run([URL, "--model", "gemini-2.5-pro"], deps)).toBe(0);
    expect(deps.summarize).toHaveBeenCalledWith(expect.objectContaining({ model: "gemini-2.5-pro" }));
    expect(await readFile(out[0]!, "utf8")).toContain('model: "gemini-2.5-pro"');
  });

  it.each([["--help"], ["-h"]])("%s prints usage to stdout and exits 0 without doing anything", async (flag) => {
    const deps = makeDeps({ env: {} });
    expect(await run([flag], deps)).toBe(0);
    expect(out.join("\n")).toMatch(/^Usage: yt-md-summary <url>/);
    expect(deps.fetchTranscript).not.toHaveBeenCalled();
  });

  it.each([["--version"], ["-v"]])("%s prints the version", async (flag) => {
    expect(await run([flag], makeDeps())).toBe(0);
    expect(out).toEqual(["1.2.3"]);
  });

  it("reports progress on stderr", async () => {
    await run([URL], makeDeps());
    expect(err).toEqual(["Fetching transcript for h9be6jbKaJo…", "Summarizing with gemini-3.8-flash…"]);
  });

  it("lets summarize report retries on stderr", async () => {
    const deps = makeDeps({
      summarize: vi.fn(async ({ log }) => {
        log("Gemini is overloaded (HTTP 503); retrying in 2s (attempt 2 of 5)…");
        return { summary: "A summary.", keyPoints: ["One"] };
      }),
    });
    expect(await run([URL], deps)).toBe(0);
    expect(err).toContain("Gemini is overloaded (HTTP 503); retrying in 2s (attempt 2 of 5)…");
  });

  it("warns and leaves the date out when the publish date is unknown", async () => {
    const deps = makeDeps({
      fetchTranscript: vi.fn(async () => ({
        title: "How Transformers Work",
        channel: "Some Channel",
        lengthSeconds: 600,
        transcript: "hello world",
      })),
    });
    expect(await run([URL], deps)).toBe(0);
    expect(out).toEqual([join(dir, "how-transformers-work-h9be6jbKaJo.md")]);
    expect(err.join("\n")).toMatch(/Warning: .*publish date/);
  });

  it("prints user errors from the network steps and exits 1 without writing a file", async () => {
    const { UserError } = await import("../src/errors.js");
    const deps = makeDeps({
      fetchTranscript: vi.fn(async () => {
        throw new UserError("This video has no captions available.");
      }),
    });
    expect(await run([URL], deps)).toBe(1);
    expect(err.at(-1)).toBe("Error: This video has no captions available.");
    expect(await readdir(dir)).toEqual([]);
  });
});

describe("run: happy path", () => {
  it("writes the summary into --dir and prints only its path to stdout", async () => {
    const deps = makeDeps();
    const code = await run([URL, "--dir", dir], deps);

    expect(code).toBe(0);
    const file = join(dir, "2024-05-01-how-transformers-work-h9be6jbKaJo.md");
    expect(out).toEqual([file]);
    const md = await readFile(file, "utf8");
    expect(md).toContain('title: "How Transformers Work"');
    expect(md).toContain("summarized: 2026-10-25");
    expect(md).toContain('model: "gemini-3.8-flash"');
    expect(md).toContain("- One\n- Two\n");
    expect(deps.summarize).toHaveBeenCalledWith(
      expect.objectContaining({ transcript: "hello world", apiKey: "test-key", model: "gemini-3.8-flash" }),
    );
  });
});
