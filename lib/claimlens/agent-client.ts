import {
  initialTimeline,
  runMockClaimAgent,
  TIMELINE,
} from "./agent-runner";
import type {
  ClaimCase,
  ClaimFacts,
  DamageEvidence,
  EvidenceItem,
  PaymentEvidence,
  ReceiptEvidence,
  Resolution,
} from "./types";

/**
 * Abstraction layer for the ClaimLens agent.
 *
 * `runMockClaimAgent` is the local, deterministic implementation that drives
 * the hackathon demo with zero external dependencies.
 *
 * The hooks below are extension points for the real, production-grade agent.
 * They are deliberately thin so you can swap in:
 *
 *   - Subconscious (`SUBCONSCIOUS_API_KEY`) for LLM reasoning, structured
 *     extraction (`response_format: json_schema`), and the empathetic
 *     customer reply.
 *   - Baseten (`BASETEN_API_KEY`) for hosted vision models that actually
 *     inspect the damage / receipt / payment screenshots instead of the
 *     mock inspector tools.
 *   - Cloudflare (`CLOUDFLARE_ACCOUNT_ID` / `CLOUDFLARE_API_TOKEN`) for
 *     Workers + Agents that host the agent loop, KV/D1 for case storage,
 *     R2 for evidence blobs, and Durable Objects for audit log streams.
 *
 * The local mock mode must always continue to work without these.
 */

export { initialTimeline, runMockClaimAgent, TIMELINE };
export type { ClaimCase, EvidenceItem, Resolution };

export async function runRealClaimAgent(): Promise<never> {
  throw new Error(
    "Real agent not wired yet. Implement against Subconscious in /api/claim-agent.",
  );
}

/**
 * Optional: polish the agent-drafted customer reply using Subconscious.
 * Falls back to the mock reply if the API route is missing or errors.
 */
export async function polishReplyWithSubconscious(input: {
  reply: string;
  transcript: string;
  resolution: Resolution;
}): Promise<{ reply: string; source: "subconscious" | "mock" }> {
  try {
    const res = await fetch("/api/claim-polish", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(input),
    });
    if (!res.ok) {
      return { reply: input.reply, source: "mock" };
    }
    const data = (await res.json()) as { reply?: string };
    if (!data.reply || typeof data.reply !== "string") {
      return { reply: input.reply, source: "mock" };
    }
    return { reply: data.reply, source: "subconscious" };
  } catch {
    return { reply: input.reply, source: "mock" };
  }
}

/**
 * Extract claim facts via Baseten Nemotron with structured JSON output.
 * Returns null on any failure so the caller can fall back to the mock.
 */
export async function extractFactsWithBaseten(
  transcript: string,
): Promise<ClaimFacts | null> {
  try {
    const res = await fetch("/api/claim-extract", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ transcript }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { facts?: ClaimFacts };
    return data.facts ?? null;
  } catch {
    return null;
  }
}

type VisionKind = "damage" | "receipt" | "payment";

type VisionResult<K extends VisionKind> = K extends "damage"
  ? DamageEvidence
  : K extends "receipt"
    ? ReceiptEvidence
    : PaymentEvidence;

/**
 * Send a customer-uploaded image to Baseten Kimi-K2.6 vision for real visual
 * inspection. Returns null on any failure so the caller can fall back to the
 * honest "inspection pending" mock.
 */
export async function inspectEvidenceWithBaseten<K extends VisionKind>(
  kind: K,
  evidence: EvidenceItem,
): Promise<VisionResult<K> | null> {
  if (!evidence.dataUrl) return null;
  try {
    const res = await fetch("/api/inspect-evidence", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        kind,
        dataUrl: evidence.dataUrl,
        label: evidence.label,
      }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      result?: VisionResult<K> | (ReceiptEvidence & { orderId: string | null });
    };
    if (!data.result) return null;
    if (kind === "receipt") {
      const r = data.result as ReceiptEvidence & {
        orderId: string | null;
        customerName: string | null;
        product: string | null;
        amount: number | null;
      };
      if (!r.orderId) return null;
      return {
        orderId: r.orderId,
        customerName: r.customerName ?? "Unknown",
        product: r.product ?? "Unknown product",
        amount: r.amount ?? 0,
      } as VisionResult<K>;
    }
    return data.result as VisionResult<K>;
  } catch {
    return null;
  }
}

/**
 * Generate the final resolution via Baseten Nemotron with a JSON schema.
 * Returns null on any failure so the caller can fall back to the mock.
 */
export async function reasonResolutionWithBaseten(
  payload: Record<string, unknown>,
): Promise<Pick<
  Resolution,
  "recommendation" | "confidence" | "risk" | "reasoning" | "actions" | "ticketSummary"
> | null> {
  try {
    const res = await fetch("/api/claim-reason", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      resolution?: Pick<
        Resolution,
        | "recommendation"
        | "confidence"
        | "risk"
        | "reasoning"
        | "actions"
        | "ticketSummary"
      >;
    };
    return data.resolution ?? null;
  } catch {
    return null;
  }
}
