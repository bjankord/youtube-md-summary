import { ApiError, GoogleGenAI } from "@google/genai";
import { UserError } from "./errors.js";
import type { Summary, SummarizeInput } from "./run.js";

const MAX_ATTEMPTS = 5;
const BASE_DELAY_MS = 2000;
const FALLBACK_MODEL_HINT = "gemini-3.6-flash";

const SYSTEM_INSTRUCTION = `You summarize YouTube video transcripts.
Always write in English, whatever the transcript's language.
Return a "summary" of 1-3 paragraphs (separate paragraphs with a blank line) and 5-10 "keyPoints",
scaling both to the video's length and density. Key points are single sentences, without leading bullets.
Base everything on the transcript only; do not invent details.`;

const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    summary: { type: "string" },
    keyPoints: { type: "array", items: { type: "string" } },
  },
  required: ["summary", "keyPoints"],
};

export async function summarize({ transcript, title, lengthSeconds, model, apiKey, log }: SummarizeInput): Promise<Summary> {
  const ai = new GoogleGenAI({ apiKey });
  const minutes = Math.max(1, Math.round(lengthSeconds / 60));
  const contents = `Video title: ${title}\nVideo length: about ${minutes} minutes\n\nTranscript:\n${transcript}`;

  for (let attempt = 1; ; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents,
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          responseMimeType: "application/json",
          responseJsonSchema: RESPONSE_SCHEMA,
        },
      });
      return parseSummary(response.text);
    } catch (error) {
      if (isRetryable(error) && attempt < MAX_ATTEMPTS) {
        const delayMs = BASE_DELAY_MS * 2 ** (attempt - 1);
        log(`${describeStatus(error.status)}; retrying in ${delayMs / 1000}s (attempt ${attempt + 1} of ${MAX_ATTEMPTS})…`);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        continue;
      }
      throw toUserError(error, model) ?? error;
    }
  }
}

function parseSummary(text: string | undefined): Summary {
  try {
    const parsed = JSON.parse(text ?? "") as Partial<Summary>;
    if (typeof parsed.summary === "string" && Array.isArray(parsed.keyPoints)) {
      return { summary: parsed.summary, keyPoints: parsed.keyPoints.map(String) };
    }
  } catch {
    // Fall through to the error below.
  }
  throw new UserError("Gemini returned a response that was not a valid summary. Try again.");
}

function isRetryable(error: unknown): error is ApiError {
  return error instanceof ApiError && (error.status === 429 || error.status >= 500);
}

function describeStatus(status: number): string {
  if (status === 429) return "Gemini rate limit hit (HTTP 429)";
  if (status === 503) return "Gemini is overloaded (HTTP 503)";
  return `Gemini server error (HTTP ${status})`;
}

/** The SDK puts the raw JSON error body in `message`; pull out Google's human-readable part. */
function googleMessage(error: ApiError): string {
  try {
    const body = JSON.parse(error.message) as { error?: { message?: string } };
    if (body.error?.message) return body.error.message;
  } catch {
    // Not JSON; use it as is.
  }
  return error.message;
}

function toUserError(error: unknown, model: string): UserError | undefined {
  if (!(error instanceof ApiError)) return undefined;
  const detail = googleMessage(error);
  if (error.status === 429) {
    return new UserError(
      `Gemini rate limit reached: ${detail}\nCheck your quota at https://aistudio.google.com/rate-limit`,
    );
  }
  if (error.status === 503) {
    return new UserError(
      `Gemini is overloaded and ${model} did not respond after ${MAX_ATTEMPTS} attempts: ${detail}\n` +
        `Try again in a few minutes, or use another model, e.g. --model ${FALLBACK_MODEL_HINT}`,
    );
  }
  if (error.status === 401 || error.status === 403 || /API key not valid/i.test(error.message)) {
    return new UserError("Gemini rejected the API key. Check GEMINI_API_KEY / GOOGLE_API_KEY.");
  }
  if (error.status === 404) {
    return new UserError(`Gemini model not found: ${model}`);
  }
  if (error.status === 400) {
    return new UserError(`Gemini rejected the request: ${detail}`);
  }
  return new UserError(`Gemini request failed (HTTP ${error.status}): ${detail}\nTry again later.`);
}
