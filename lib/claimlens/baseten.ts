import { createOpenAI } from "@ai-sdk/openai";

export const BASETEN_BASE_URL = "https://inference.baseten.co/v1";

/**
 * Baseten Model APIs are OpenAI-compatible. We hit `nvidia/Nemotron-120B-A12B`
 * because that's the slug the team is provisioned for; structured outputs and
 * tool calls work via the standard OpenAI shape.
 *
 * See: https://docs.baseten.co/inference/model-apis/overview
 */
export const BASETEN_MODEL_ID = "nvidia/Nemotron-120B-A12B";

/**
 * Vision-capable model on Baseten — used to actually inspect the customer's
 * uploaded damage photos, receipts, and payment screenshots.
 *
 * Kimi-K2.6 supports `input_modalities: ["text", "image"]` plus structured
 * outputs and JSON mode (verified via `GET /v1/models`).
 */
export const BASETEN_VISION_MODEL_ID = "moonshotai/Kimi-K2.6";

const baseten = createOpenAI({
  baseURL: BASETEN_BASE_URL,
  apiKey: process.env.BASETEN_API_KEY,
});

export const basetenModel = baseten.chat(BASETEN_MODEL_ID);
export const basetenVisionModel = baseten.chat(BASETEN_VISION_MODEL_ID);

export function hasBasetenKey(): boolean {
  return Boolean(process.env.BASETEN_API_KEY);
}
