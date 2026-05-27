/**
 * Server-only Baseten Kimi-K2.6 vision inspection.
 *
 * Called from both /api/inspect-evidence (for the browser) and from
 * /api/voicerun/webhook (for inbound phone-call evidence).
 */

import { generateText } from "ai";
import { z } from "zod";
import { basetenVisionModel, hasBasetenKey } from "./baseten";
import { extractJsonObject } from "./json-parse";
import type {
  DamageEvidence,
  PaymentEvidence,
  ReceiptEvidence,
} from "./types";

const DamageSchema = z.object({
  damageDetected: z.boolean(),
  damageType: z.string(),
  severity: z.enum(["low", "medium", "high"]),
  visualSummary: z.string(),
  recommendedPath: z.enum(["replacement", "repair", "refund", "investigate"]),
});

const ReceiptSchema = z.object({
  orderId: z.string().nullable(),
  customerName: z.string().nullable(),
  product: z.string().nullable(),
  amount: z.number().nullable(),
});

const PaymentSchema = z.object({
  duplicateChargeLikely: z.boolean(),
  amount: z.number(),
  duplicateCount: z.number(),
  summary: z.string(),
});

const PROMPTS: Record<"damage" | "receipt" | "payment", string> = {
  damage: [
    "You are inspecting a customer-supplied damage photo for a furniture warranty claim.",
    "Look at the image carefully. Decide if there is visible damage, what kind, and the severity.",
    "Return ONE JSON object and nothing else. No markdown fences. No prose.",
    "",
    "Schema:",
    "{",
    '  "damageDetected": boolean,',
    '  "damageType": string (e.g. "structural crack", "scratch", "stain", "missing piece", "intact"),',
    '  "severity": "low" | "medium" | "high",',
    '  "visualSummary": string (1-2 sentences describing exactly what is visible),',
    '  "recommendedPath": "replacement" | "repair" | "refund" | "investigate"',
    "}",
    "",
    "Rules:",
    "- If structural / load-bearing damage, severity = high and recommendedPath = replacement.",
    "- If cosmetic damage like a scratch or scuff, severity = low/medium and recommendedPath = repair or refund.",
    "- If the image is unclear or shows no damage, damageDetected = false and recommendedPath = investigate.",
    "",
    "JSON:",
  ].join("\n"),
  receipt: [
    "You are extracting structured data from a customer's receipt/order screenshot.",
    "Return ONE JSON object and nothing else. No markdown fences. No prose.",
    "",
    "Schema:",
    "{",
    '  "orderId": string | null (e.g. "WF-20491"),',
    '  "customerName": string | null,',
    '  "product": string | null,',
    '  "amount": number | null (total in dollars, e.g. 249.99)',
    "}",
    "",
    "Use null when the field is not legible in the image.",
    "",
    "JSON:",
  ].join("\n"),
  payment: [
    "You are inspecting a customer's payment/card screenshot for evidence of a duplicate charge.",
    "Return ONE JSON object and nothing else. No markdown fences. No prose.",
    "",
    "Schema:",
    "{",
    '  "duplicateChargeLikely": boolean,',
    '  "amount": number (largest single charge in dollars, 0 if none visible),',
    '  "duplicateCount": number (number of identical-amount charges visible, 1 if no duplicate),',
    '  "summary": string (1-2 sentences describing what is visible on the screenshot)',
    "}",
    "",
    "Rules:",
    "- duplicateChargeLikely = true only if two or more charges of the same amount to the same merchant are visible close together in time.",
    "- If only one charge is visible, duplicateCount = 1 and duplicateChargeLikely = false.",
    "",
    "JSON:",
  ].join("\n"),
};

export type VisionResult =
  | { kind: "damage"; result: DamageEvidence; source: "baseten-kimi" }
  | { kind: "receipt"; result: ReceiptEvidence | null; source: "baseten-kimi" }
  | { kind: "payment"; result: PaymentEvidence; source: "baseten-kimi" };

export async function inspectImageOnBaseten(
  kind: "damage" | "receipt" | "payment",
  dataUrl: string,
): Promise<VisionResult | { error: string }> {
  if (!hasBasetenKey()) {
    return { error: "BASETEN_API_KEY not configured" };
  }
  if (!dataUrl.startsWith("data:image/")) {
    return { error: "dataUrl must be a data:image/... base64 URL" };
  }

  try {
    const { text } = await generateText({
      model: basetenVisionModel,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: PROMPTS[kind] },
            { type: "image", image: dataUrl },
          ],
        },
      ],
      maxOutputTokens: 600,
      temperature: 0.2,
    });

    const obj = extractJsonObject(text);
    if (!obj) {
      return { error: "Vision model did not return parseable JSON" };
    }

    if (kind === "damage") {
      const parsed = DamageSchema.safeParse(obj);
      if (!parsed.success) return { error: "Damage JSON failed schema" };
      return { kind, result: parsed.data, source: "baseten-kimi" };
    }
    if (kind === "receipt") {
      const parsed = ReceiptSchema.safeParse(obj);
      if (!parsed.success) return { error: "Receipt JSON failed schema" };
      const r = parsed.data;
      if (!r.orderId) {
        return { kind, result: null, source: "baseten-kimi" };
      }
      return {
        kind,
        result: {
          orderId: r.orderId,
          customerName: r.customerName ?? "Unknown",
          product: r.product ?? "Unknown product",
          amount: r.amount ?? 0,
        },
        source: "baseten-kimi",
      };
    }
    const parsed = PaymentSchema.safeParse(obj);
    if (!parsed.success) return { error: "Payment JSON failed schema" };
    return { kind, result: parsed.data, source: "baseten-kimi" };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Baseten vision inspection failed",
    };
  }
}
