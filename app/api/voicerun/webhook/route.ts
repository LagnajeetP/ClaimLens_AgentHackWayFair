import { runMockClaimAgent } from "@/lib/claimlens/agent-runner";
import type {
  DamageEvidence,
  EvidenceItem,
  PaymentEvidence,
  ReceiptEvidence,
} from "@/lib/claimlens/types";
import { inspectImageOnBaseten } from "@/lib/claimlens/vision-server";

export const maxDuration = 120;

/**
 * VoiceRun webhook intake.
 *
 * Production wiring (recommended):
 *
 *   1. Build a code-first voice agent on VoiceRun (`pip install voicerun-cli`).
 *   2. Configure your VoiceRun agent to POST the live transcript here when the
 *      caller stops speaking, e.g.:
 *
 *      POST {PUBLIC_BASE_URL}/api/voicerun/webhook
 *      Authorization: Bearer ${VOICERUN_WEBHOOK_SECRET}
 *      Content-Type: application/json
 *      {
 *        "callId": "vr_abc123",
 *        "callerId": "+15551234567",
 *        "transcript": "Hi, my chair arrived cracked yesterday...",
 *        "evidence": [
 *          { "kind": "damage", "label": "vr-damage-vr_abc123.jpg", "dataUrl": "..." }
 *        ]
 *      }
 *
 *   3. We run the ClaimLens agent loop and return the drafted customer reply.
 *      Your VoiceRun agent then speaks it back to the caller with TTS.
 *
 *   4. For full-duplex live assist, stream tool-step events back through a
 *      Server-Sent Events or websocket channel so the rep watches the
 *      investigation in real time.
 *
 * For the hackathon the browser Web Speech API already proves the UX. This
 * endpoint is the production hand-off.
 */

type WebhookBody = {
  callId?: string;
  callerId?: string;
  transcript?: string;
  evidence?: EvidenceItem[];
};

function verifySecret(req: Request): boolean {
  const expected = process.env.VOICERUN_WEBHOOK_SECRET;
  if (!expected) return true;
  const header = req.headers.get("authorization") ?? "";
  return header === `Bearer ${expected}`;
}

export async function POST(req: Request) {
  if (!verifySecret(req)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: WebhookBody;
  try {
    body = (await req.json()) as WebhookBody;
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const transcript = body.transcript?.trim();
  if (!transcript) {
    return Response.json({ error: "transcript is required" }, { status: 400 });
  }

  const evidence = Array.isArray(body.evidence) ? body.evidence : [];

  try {
    const claim = await runMockClaimAgent(
      { transcript, evidence },
      {},
      {
        mode: "mock",
        real: {
          inspectDamage: async (ev) => {
            if (!ev.dataUrl) return null;
            const out = await inspectImageOnBaseten("damage", ev.dataUrl);
            return "error" in out
              ? null
              : (out.result as DamageEvidence);
          },
          extractReceipt: async (ev) => {
            if (!ev.dataUrl) return null;
            const out = await inspectImageOnBaseten("receipt", ev.dataUrl);
            return "error" in out
              ? null
              : ((out.result as ReceiptEvidence | null) ?? null);
          },
          inspectPayment: async (ev) => {
            if (!ev.dataUrl) return null;
            const out = await inspectImageOnBaseten("payment", ev.dataUrl);
            return "error" in out
              ? null
              : (out.result as PaymentEvidence);
          },
        },
      },
    );
    return Response.json({
      callId: body.callId ?? null,
      callerId: body.callerId ?? null,
      recommendation: claim.resolution?.recommendation,
      confidence: claim.resolution?.confidence,
      risk: claim.resolution?.risk,
      reply: claim.resolution?.customerReply,
      ticketSummary: claim.resolution?.ticketSummary,
      actions: claim.resolution?.actions,
      reasoning: claim.resolution?.reasoning,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "ClaimLens agent failed";
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function GET() {
  return Response.json({
    status: "ok",
    endpoint: "voicerun-webhook",
    method: "POST",
    expects: {
      callId: "string",
      callerId: "string (e.g. +15551234567)",
      transcript: "string — the customer's voice transcript",
      evidence:
        "optional EvidenceItem[] — { kind, label, dataUrl?, note?, isDemo? }",
    },
    auth: "Bearer ${VOICERUN_WEBHOOK_SECRET} if env var is set",
  });
}
