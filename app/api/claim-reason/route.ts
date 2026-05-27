import { generateText } from "ai";
import { z } from "zod";
import { basetenModel, hasBasetenKey } from "@/lib/claimlens/baseten";
import { extractJsonObject } from "@/lib/claimlens/json-parse";

export const maxDuration = 60;

const ResolutionSchema = z.object({
  recommendation: z.string(),
  confidence: z.number().min(0).max(100),
  risk: z.enum(["low", "medium", "high"]),
  reasoning: z.array(z.string()).min(1).max(8),
  actions: z
    .array(
      z.object({
        label: z.string(),
        kind: z.enum(["refund", "replacement", "credit", "escalate", "note"]),
        amount: z
          .number()
          .nullish()
          .transform((v) => (v === null ? undefined : v)),
      }),
    )
    .min(1)
    .max(8),
  ticketSummary: z.string(),
});

export async function POST(req: Request) {
  if (!hasBasetenKey()) {
    return Response.json(
      { error: "BASETEN_API_KEY not configured" },
      { status: 503 },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const prompt = [
    "You are a Wayfair customer service resolution agent.",
    "Decide on the best resolution given the customer's transcript and the structured evidence below.",
    "Return ONE JSON object and nothing else. No markdown fences. No prose before or after.",
    "",
    "Schema:",
    "{",
    '  "recommendation": string,',
    '  "confidence": integer 0..100,',
    '  "risk": "low" | "medium" | "high",',
    '  "reasoning": string[] (3-6 short sentences citing the evidence),',
    '  "actions": array of { "label": string, "kind": "refund"|"replacement"|"credit"|"escalate"|"note", "amount"?: number },',
    '  "ticketSummary": string (2-3 sentences, third person)',
    "}",
    "",
    "Rules:",
    "- If damage is detected AND policy allows it, recommend a replacement.",
    "- If duplicate captured payments exist, recommend refunding the duplicate; include an action with kind='refund' and the amount.",
    "- Combine both when both apply.",
    "- confidence: 85-99 with strong evidence on all sides, 65-84 if some evidence missing, below 65 if conflicting.",
    "- risk: 'low' if confidence>=85, 'medium' if 65-84, else 'high'.",
    "",
    "Evidence (JSON):",
    JSON.stringify(body, null, 2),
    "",
    "JSON:",
  ].join("\n");

  try {
    const { text } = await generateText({
      model: basetenModel,
      prompt,
      maxOutputTokens: 1500,
      temperature: 0.2,
    });
    const obj = extractJsonObject(text);
    if (!obj) {
      return Response.json(
        { error: "Model did not return parseable JSON", raw: text.slice(0, 600) },
        { status: 502 },
      );
    }
    const parsed = ResolutionSchema.safeParse(obj);
    if (!parsed.success) {
      return Response.json(
        {
          error: "Model JSON failed schema validation",
          issues: parsed.error.issues.slice(0, 5),
          raw: text.slice(0, 600),
        },
        { status: 502 },
      );
    }
    return Response.json({ resolution: parsed.data, source: "baseten" });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Baseten resolution failed";
    return Response.json({ error: message }, { status: 500 });
  }
}
