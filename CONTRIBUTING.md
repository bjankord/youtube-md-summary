# Contributing

Thanks for your interest in yt-md-summary!

## Issues first

Bug reports and feature requests are welcome as [GitHub issues](../../issues). Please use the issue templates and never paste your API key.

## Pull requests

Pull requests are limited to collaborators. If you'd like to contribute code, open an issue to discuss the change first. If it's a good fit, you may be given access to open a PR for it.

## Development

Requires Node 24 or later.

```bash
npm install
npm test          # unit tests (no network)
npm run typecheck
npm run build     # compiles to dist/
node dist/cli.js "https://www.youtube.com/watch?v=<id>" --dir <existing-dir>
```
