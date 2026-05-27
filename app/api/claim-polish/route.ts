import { generateText } from "ai";
import { subconsciousModel } from "@/lib/subconscious";

export const maxDuration = 60;

type Body = {
  reply?: string;
  transcript?: string;
  resolution?: {
    recommendation?: string;
    confidence?: number;
    customerReply?: string;
    reasoning?: string[];
    actions?: Array<{ label: string; kind: string }>;
  };
};

export async function POST(req: Request) {
  if (!process.env.SUBCONSCIOUS_API_KEY) {
    return Response.json(
      { error: "SUBCONSCIOUS_API_KEY not configured. Using mock reply." },
      { status: 503 },
    );
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const reply = body.reply ?? body.resolution?.customerReply ?? "";
  const transcript = body.transcript ?? "";
  const resolution = body.resolution ?? {};

  const prompt = [
    "You are a senior Wayfair customer support agent.",
    "Rewrite the draft reply below to feel warm, concise, and human.",
    "Keep it under 90 words. Lead with empathy, name concrete actions, end with a single offer to help further. No emojis. No bullet lists.",
    "",
    `Customer said: "${transcript}"`,
    "",
    "Agent recommendation:",
    `- ${resolution.recommendation ?? "n/a"} (confidence ${resolution.confidence ?? "?"}%)`,
    ...(resolution.actions ?? []).map((a) => `- ${a.label}`),
    "",
    "Draft reply to rewrite:",
    reply,
    "",
    "Return ONLY the polished reply text, no preamble.",
  ].join("\n");

  try {
    const { text } = await generateText({
      model: subconsciousModel,
      prompt,
      maxOutputTokens: 350,
    });
    const cleaned = text.trim();
    return Response.json({ reply: cleaned, source: "subconscious" });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Subconscious call failed";
    return Response.json({ error: message }, { status: 500 });
  }
}
