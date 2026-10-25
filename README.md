# yt-md-summary

CLI that turns a YouTube video's transcript into a markdown summary with key points, using Google Gemini.

```bash
yt-md-summary "https://www.youtube.com/watch?v=4z2i6UsQG1k" --dir my-yt-summaries
```

This writes a file like `my-yt-summaries/2026-10-22-build-an-obsidian-backend-not-a-second-brain-4z2i6UsQG1k.md` and prints its path.

## Install

Requires Node 24 or later.

```bash
npm i -g yt-md-summary
```

Or run it without installing:

```bash
npx yt-md-summary "https://www.youtube.com/watch?v=<id>"
```

## API key

Get a free key from [Google AI Studio](https://aistudio.google.com/apikey) and export it:

```bash
export GEMINI_API_KEY="your-key"
```

`GEMINI_API_KEY` is checked first. If it isn't set, `GOOGLE_API_KEY` is used instead.

### Free tier notes

- On the Gemini API free tier, Google may use the content you send (here, the video transcript) to improve its products. See [Gemini API pricing](https://ai.google.dev/gemini-api/docs/pricing).
- Rate limits are per Google Cloud project. Check yours at [aistudio.google.com/rate-limit](https://aistudio.google.com/rate-limit). Rate-limited requests are retried with backoff before giving up.

## Usage

```
yt-md-summary <url> [--dir <path>] [--force] [--model <id>]
```

| Option          | Description                                                                 |
| --------------- | --------------------------------------------------------------------------- |
| `<url>`         | `https://www.youtube.com/watch?v=<id>` or `https://www.youtube.com/shorts/<id>` |
| `--dir <path>`  | Existing directory to write into. Defaults to the current directory. It is never created for you. |
| `--force`       | Write a new summary even if one for this video already exists in `--dir`.  |
| `--model <id>`  | Gemini model to use. Defaults to `gemini-3.8-flash`.                         |
| `-h, --help`    | Show help.                                                                  |
| `-v, --version` | Show the version.                                                           |

Before anything is downloaded, the CLI checks the URL, the directory, the API key and whether a summary for this video already exists. If any check fails, it exits with an error.

Progress messages go to stderr and only the written file's path goes to stdout, so you can do things like:

```bash
code "$(yt-md-summary "https://www.youtube.com/watch?v=<id>" --dir notes)"
```

## Output

Files are named `<publish date>-<title>-<video id>.md`. The publish date or the title is left out if it isn't available.

```markdown
---
title: "Video title"
url: "https://www.youtube.com/watch?v=..."
videoId: "..."
channel: "Channel name"
published: 2026-10-20
summarized: 2026-10-25
model: "gemini-3.8-flash"
---

# Video title

## Summary

...

## Key Points

- ...
```

Summaries are always written in English, whatever language the captions are in. The video must have captions (auto-generated captions work).

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

[MIT](LICENSE)
