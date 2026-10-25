import { readdir } from "node:fs/promises";

/** Returns the name of a summary file for `videoId` already in `dir`, if any. */
export async function findExistingSummary(dir: string, videoId: string): Promise<string | undefined> {
  const entries = await readdir(dir, { withFileTypes: true });
  const suffix = `${videoId}.md`;
  return entries.find(
    (entry) => entry.isFile() && (entry.name === suffix || entry.name.endsWith(`-${suffix}`)),
  )?.name;
}
