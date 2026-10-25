#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { fetchTranscript } from "./youtube.js";
import { summarize } from "./gemini.js";
import { run } from "./run.js";

const { version } = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")) as {
  version: string;
};

process.exitCode = await run(process.argv.slice(2), {
  fetchTranscript,
  summarize,
  env: process.env,
  cwd: process.cwd(),
  now: () => new Date(),
  version,
  stdout: (line) => process.stdout.write(`${line}\n`),
  stderr: (line) => process.stderr.write(`${line}\n`),
});
