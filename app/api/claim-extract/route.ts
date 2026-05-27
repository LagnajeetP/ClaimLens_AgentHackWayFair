import { generateText } from "ai";
import { z } from "zod";
import { basetenModel, hasBasetenKey } from "@/lib/claimlens/baseten";
import { extractJsonObject } from "@/lib/claimlens/json-parse";

export const maxDuration = 60;

const ClaimFactsSchema = z.object({
  productMentioned: z.string(),
  issueTypes: z.array(
    z.enum([
      "damaged_item",
      "duplicate_charge",
      "late_delivery",
      "wrong_item",
      "missing_parts",
      "other",
    ]),
  ),
  damageDescription: z.string().optional(),
  urgency: z.enum(["today", "this_week", "no_rush", "unknown"]),
  deliveryTiming: z.string().optional(),
  customerSentiment: z.enum([
    "frustrated",
    "calm",
    "angry",
    "confused",
    "neutral",
  ]),
  requestedOutcome: z.string(),
});

export async function POST(req: Request) {
  if (!hasBasetenKey()) {
    return Response.json(
      { error: "BASETEN_API_KEY not configured" },
      { status: 503 },
    );
  }

  let body: { transcript?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const transcript = body.transcript?.trim();
  if (!transcript) {
    return Response.json({ error: "transcript is required" }, { status: 400 });
  }

  const prompt = [
    "You are a Wayfair customer service claim analyzer.",
    "Extract structured facts from the customer's voice transcript below.",
    "Return ONE JSON object and nothing else. No markdown fences. No prose.",
    "",
    "Schema:",
    "{",
    '  "productMentioned": string,',
    '  "issueTypes": array of one or more of ["damaged_item","duplicate_charge","late_delivery","wrong_item","missing_parts","other"],',
    '  "damageDescription": string | undefined,',
    '  "urgency": "today" | "this_week" | "no_rush" | "unknown",',
    '  "deliveryTiming": string | undefined,',
    '  "customerSentiment": "frustrated" | "calm" | "angry" | "confused" | "neutral",',
    '  "requestedOutcome": string',
    "}",
    "",
    "Rules:",
    "- If the customer mentions being charged twice or sees two charges, include 'duplicate_charge'.",
    "- urgency = 'today' if customer explicitly needs it today.",
    "",
    `Transcript: """${transcript}"""`,
    "",
    "JSON:",
  ].join("\n");

  try {
    const { text } = await generateText({
      model: basetenModel,
      prompt,
      maxOutputTokens: 600,
      temperature: 0.2,
    });
    const obj = extractJsonObject(text);
    if (!obj) {
      return Response.json(
        { error: "Model did not return parseable JSON", raw: text.slice(0, 500) },
        { status: 502 },
      );
    }
    const parsed = ClaimFactsSchema.safeParse(obj);
    if (!parsed.success) {
      return Response.json(
        {
          error: "Model JSON failed schema validation",
          issues: parsed.error.issues.slice(0, 5),
          raw: text.slice(0, 500),
        },
        { status: 502 },
      );
    }
    return Response.json({ facts: parsed.data, source: "baseten" });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Baseten claim extraction failed";
    return Response.json({ error: message }, { status: 500 });
  }
}
