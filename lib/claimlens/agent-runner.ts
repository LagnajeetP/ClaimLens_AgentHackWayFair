import {
  buildCaseEvidence,
  checkRefundPolicy,
  extractClaimFacts,
  extractReceiptFacts,
  generateResolution,
  getCustomerHistory,
  getOrder,
  getPaymentStatus,
  getShipmentStatus,
  inspectDamageEvidence,
  inspectPaymentEvidence,
  transcribeClaim,
} from "./mock-tools";
import type {
  AgentStep,
  AgentStepId,
  AgentStepStatus,
  AuditLogEntry,
  ClaimCase,
  ClaimFacts,
  DamageEvidence,
  EvidenceItem,
  PaymentEvidence,
  ReceiptEvidence,
  Resolution,
} from "./types";

export const TIMELINE: Array<{ id: AgentStepId; title: string }> = [
  { id: "listen", title: "Listening to customer claim" },
  { id: "extract_facts", title: "Extracting claim details" },
  { id: "inspect_damage", title: "Inspecting damage evidence" },
  { id: "extract_receipt", title: "Extracting receipt/order details" },
  { id: "inspect_payment", title: "Checking payment evidence" },
  { id: "lookup_order", title: "Looking up order record" },
  { id: "check_shipping", title: "Checking shipment status" },
  { id: "check_policy", title: "Checking refund and warranty policy" },
  { id: "generate_resolution", title: "Generating recommendation" },
  { id: "draft_reply", title: "Drafting customer response" },
  { id: "create_ticket", title: "Creating internal ticket" },
];

export function initialTimeline(): AgentStep[] {
  return TIMELINE.map((s) => ({ ...s, status: "pending" as AgentStepStatus }));
}

export type AgentRunnerEvents = {
  onStep?: (step: AgentStep) => void;
  onAudit?: (entry: AuditLogEntry) => void;
  onCase?: (claim: ClaimCase) => void;
};

export type RealAgentHooks = {
  extractFacts?: (transcript: string) => Promise<ClaimFacts | null>;
  generateResolution?: (
    payload: Record<string, unknown>,
  ) => Promise<Pick<
    Resolution,
    | "recommendation"
    | "confidence"
    | "risk"
    | "reasoning"
    | "actions"
    | "ticketSummary"
  > | null>;
  inspectDamage?: (evidence: EvidenceItem) => Promise<DamageEvidence | null>;
  extractReceipt?: (evidence: EvidenceItem) => Promise<ReceiptEvidence | null>;
  inspectPayment?: (evidence: EvidenceItem) => Promise<PaymentEvidence | null>;
};

export type AgentRunOptions = {
  mode?: "mock" | "live";
  real?: RealAgentHooks;
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function makeAudit(
  message: string,
  kind: AuditLogEntry["kind"] = "info",
): AuditLogEntry {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    ts: Date.now(),
    message,
    kind,
  };
}

export async function runMockClaimAgent(
  input: { transcript: string; evidence: ClaimCase["evidence"] },
  events: AgentRunnerEvents = {},
  options: AgentRunOptions = {},
): Promise<ClaimCase> {
  const claim: ClaimCase = {
    transcript: input.transcript,
    evidence: input.evidence,
  };
  const live = options.mode === "live";
  const real = options.real ?? {};

  const { damageEv, receiptEv, paymentEv } = buildCaseEvidence(claim);

  async function step<T>(
    id: AgentStepId,
    title: string,
    work: () => Promise<T> | T,
    options: { warnIf?: (result: T) => boolean; detail?: (r: T) => string } = {},
  ): Promise<T> {
    const startedAt = Date.now();
    events.onStep?.({ id, title, status: "running", startedAt });
    await sleep(380 + Math.random() * 280);
    const result = await work();
    const status: AgentStepStatus = options.warnIf && options.warnIf(result)
      ? "warn"
      : "done";
    events.onStep?.({
      id,
      title,
      status,
      startedAt,
      finishedAt: Date.now(),
      detail: options.detail?.(result),
    });
    return result;
  }

  events.onAudit?.(makeAudit("Voice claim received", "evidence"));

  await step("listen", "Listening to customer claim", () => {
    claim.transcript = transcribeClaim(input.transcript);
    return claim.transcript;
  });

  claim.facts = await step(
    "extract_facts",
    "Extracting claim details",
    async () => {
      if (live && real.extractFacts) {
        const out = await real.extractFacts(claim.transcript);
        if (out) {
          events.onAudit?.(
            makeAudit("Facts extracted via Baseten Nemotron", "tool"),
          );
          return out;
        }
        events.onAudit?.(
          makeAudit("Baseten unavailable — using local extractor", "info"),
        );
      }
      return extractClaimFacts(claim.transcript);
    },
    {
      detail: (f) => `${f.issueTypes.join(", ")} · sentiment: ${f.customerSentiment}`,
    },
  );
  if (!live || !real.extractFacts) {
    events.onAudit?.(
      makeAudit(
        `Facts extracted — ${claim.facts.issueTypes.join(", ")}`,
        "tool",
      ),
    );
  }
  events.onCase?.({ ...claim });

  claim.damage = await step(
    "inspect_damage",
    "Inspecting damage evidence",
    async () => {
      if (!damageEv) return undefined;
      if (!damageEv.isDemo && damageEv.dataUrl && real.inspectDamage) {
        const out = await real.inspectDamage(damageEv);
        if (out) {
          events.onAudit?.(
            makeAudit("Damage image inspected by Baseten Kimi-K2.6 vision", "tool"),
          );
          return out;
        }
        events.onAudit?.(
          makeAudit("Vision inspection failed — using fallback", "info"),
        );
      }
      return inspectDamageEvidence(damageEv);
    },
    {
      warnIf: (d) => !d,
      detail: (d) =>
        d ? `${d.damageType} · ${d.severity} severity` : "no damage image provided",
    },
  );
  if (claim.damage && damageEv?.isDemo) {
    events.onAudit?.(makeAudit("Damage evidence inspected", "tool"));
  }
  events.onCase?.({ ...claim });

  claim.receipt = await step(
    "extract_receipt",
    "Extracting receipt/order details",
    async () => {
      if (!receiptEv) return undefined;
      if (!receiptEv.isDemo && receiptEv.dataUrl && real.extractReceipt) {
        const out = await real.extractReceipt(receiptEv);
        if (out) {
          events.onAudit?.(
            makeAudit("Receipt parsed by Baseten Kimi-K2.6 vision", "tool"),
          );
          return out;
        }
        events.onAudit?.(
          makeAudit("Receipt OCR failed or no order id found", "info"),
        );
      }
      return extractReceiptFacts(receiptEv);
    },
    {
      warnIf: (r) => !r,
      detail: (r) =>
        r ? `${r.orderId} · ${r.product} · $${r.amount.toFixed(2)}` : "no receipt",
    },
  );
  events.onCase?.({ ...claim });

  claim.payment = await step(
    "inspect_payment",
    "Checking payment evidence",
    async () => {
      if (!paymentEv) return undefined;
      if (!paymentEv.isDemo && paymentEv.dataUrl && real.inspectPayment) {
        const out = await real.inspectPayment(paymentEv);
        if (out) {
          events.onAudit?.(
            makeAudit("Payment screenshot inspected by Baseten Kimi-K2.6 vision", "tool"),
          );
          return out;
        }
        events.onAudit?.(
          makeAudit("Payment vision inspection failed — using fallback", "info"),
        );
      }
      return inspectPaymentEvidence(paymentEv);
    },
    {
      warnIf: (p) => !p,
      detail: (p) => (p ? p.summary : "no payment screenshot"),
    },
  );
  if (claim.payment?.duplicateChargeLikely && paymentEv?.isDemo) {
    events.onAudit?.(makeAudit("Duplicate payment detected", "tool"));
  }
  events.onCase?.({ ...claim });

  const orderId = claim.receipt?.orderId;
  claim.order = await step(
    "lookup_order",
    "Looking up order record",
    () => (orderId ? getOrder(orderId) : undefined),
    {
      warnIf: (o) => !o,
      detail: (o) =>
        o
          ? `${o.orderId} · ${o.customerName} · ${o.customerTier}`
          : orderId
            ? "no order match"
            : "no order id — receipt not parsed",
    },
  );
  if (claim.order) {
    events.onAudit?.(makeAudit(`Order ${claim.order.orderId} matched`, "tool"));
  } else {
    events.onAudit?.(
      makeAudit("No order matched — proceeding with available evidence", "info"),
    );
  }
  events.onCase?.({ ...claim });

  claim.paymentRecord = orderId ? getPaymentStatus(orderId) : undefined;
  claim.customer = claim.order
    ? getCustomerHistory(claim.order.customerId)
    : undefined;

  claim.shipment = await step(
    "check_shipping",
    "Checking shipment status",
    () => (orderId ? getShipmentStatus(orderId) : undefined),
    {
      warnIf: (s) => !s,
      detail: (s) =>
        s
          ? `${s.carrier} · ${s.status}`
          : orderId
            ? "no shipment record"
            : "skipped — no order id",
    },
  );
  events.onCase?.({ ...claim });

  claim.policy = await step(
    "check_policy",
    "Checking refund and warranty policy",
    () =>
      checkRefundPolicy({
        facts: claim.facts,
        damage: claim.damage,
        order: claim.order,
        payment: claim.paymentRecord,
        customer: claim.customer,
      }),
    {
      detail: (p) =>
        `${p.eligible ? "eligible" : "not eligible"} · ${p.cited.length} clauses cited`,
    },
  );
  events.onAudit?.(
    makeAudit(
      claim.policy.eligible
        ? "Policy eligibility confirmed"
        : "Policy eligibility flagged",
      "policy",
    ),
  );
  events.onCase?.({ ...claim });

  claim.resolution = await step(
    "generate_resolution",
    "Generating recommendation",
    async () => {
      const localResolution = generateResolution({
        facts: claim.facts,
        damage: claim.damage,
        receipt: claim.receipt,
        payment: claim.payment,
        order: claim.order,
        shipment: claim.shipment,
        customer: claim.customer,
        policy: claim.policy,
      });
      if (live && real.generateResolution) {
        const live_out = await real.generateResolution({
          transcript: claim.transcript,
          facts: claim.facts,
          damage: claim.damage,
          receipt: claim.receipt,
          payment: claim.payment,
          order: claim.order,
          paymentRecord: claim.paymentRecord,
          shipment: claim.shipment,
          customer: claim.customer,
          policy: claim.policy,
        });
        if (live_out) {
          events.onAudit?.(
            makeAudit(
              "Resolution reasoned by Baseten Nemotron-120B",
              "decision",
            ),
          );
          return {
            ...localResolution,
            recommendation: live_out.recommendation,
            confidence: live_out.confidence,
            risk: live_out.risk,
            reasoning: live_out.reasoning,
            actions: live_out.actions,
            ticketSummary: live_out.ticketSummary,
          };
        }
        events.onAudit?.(
          makeAudit("Baseten unavailable — using local resolver", "info"),
        );
      }
      return localResolution;
    },
    {
      detail: (r) => `${r.recommendation} · ${r.confidence}% confidence`,
    },
  );
  if (!live || !real.generateResolution) {
    events.onAudit?.(makeAudit("Recommendation generated", "decision"));
  }
  events.onCase?.({ ...claim });

  await step("draft_reply", "Drafting customer response", () => {
    return claim.resolution?.customerReply;
  });
  events.onCase?.({ ...claim });

  await step("create_ticket", "Creating internal ticket", () => {
    return claim.resolution?.ticketSummary;
  });
  events.onAudit?.(makeAudit("Internal ticket created", "tool"));
  events.onCase?.({ ...claim });

  return claim;
}

export async function runRealClaimAgent(): Promise<never> {
  throw new Error(
    "Real agent not wired yet. Set SUBCONSCIOUS_API_KEY and implement /api/claim-agent to enable.",
  );
}
