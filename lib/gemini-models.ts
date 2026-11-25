/** Keep UI and both server routes on the same model allowlist. */
export const GEMINI_MODELS = [
  { id: "gemini-3.5-flash-lite", label: "Gemini 3.5 Flash-Lite" },
  { id: "gemini-3.6-flash", label: "Gemini 3.6 Flash" },
  { id: "gemini-3.8-flash", label: "Gemini 3.8 Flash" },
] as const;

export type GeminiModel = (typeof GEMINI_MODELS)[number]["id"];

export const DEFAULT_GEMINI_MODEL: GeminiModel = "gemini-3.5-flash-lite";

export function isGeminiModel(value: unknown): value is GeminiModel {
  return (
    typeof value === "string" &&
    GEMINI_MODELS.some((model) => model.id === value)
  );
}

/** Availability/billing depend on each user's Google AI Studio project. */
