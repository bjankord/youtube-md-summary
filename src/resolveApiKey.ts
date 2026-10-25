import { UserError } from "./errors.js";

/** `GEMINI_API_KEY` (the name Google's docs use) first, then `GOOGLE_API_KEY`. */
export function resolveApiKey(env: Record<string, string | undefined>): string {
  const key = env.GEMINI_API_KEY?.trim() || env.GOOGLE_API_KEY?.trim();
  if (!key) {
    throw new UserError(
      "No Gemini API key found. Export GEMINI_API_KEY (or GOOGLE_API_KEY).\n" +
        "Get a key at https://aistudio.google.com/apikey",
    );
  }
  return key;
}
