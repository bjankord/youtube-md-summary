import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { findExistingSummary } from "../src/findExistingSummary.js";

let dir: string;
beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "yt-md-summary-"));
});
afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe("findExistingSummary", () => {
  it("returns undefined in an empty directory", async () => {
    expect(await findExistingSummary(dir, "h9be6jbKaJo")).toBeUndefined();
  });

  it("finds a summary for the video regardless of date or title", async () => {
    await writeFile(join(dir, "2023-01-01-old-title-h9be6jbKaJo.md"), "");
    expect(await findExistingSummary(dir, "h9be6jbKaJo")).toBe("2023-01-01-old-title-h9be6jbKaJo.md");
  });

  it("finds a summary with neither date nor slug", async () => {
    await writeFile(join(dir, "h9be6jbKaJo.md"), "");
    expect(await findExistingSummary(dir, "h9be6jbKaJo")).toBe("h9be6jbKaJo.md");
  });

  it("ignores other videos, other extensions and directories", async () => {
    await writeFile(join(dir, "2024-05-01-title-dQw4w9WgXcQ.md"), "");
    await writeFile(join(dir, "2024-05-01-title-h9be6jbKaJo.txt"), "");
    await writeFile(join(dir, "title-xh9be6jbKaJo.md"), "");
    await mkdir(join(dir, "2024-05-01-title-h9be6jbKaJo.md"));
    expect(await findExistingSummary(dir, "h9be6jbKaJo")).toBeUndefined();
  });
});
