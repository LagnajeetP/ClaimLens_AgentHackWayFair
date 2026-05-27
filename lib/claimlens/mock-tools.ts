import {
  CUSTOMERS,
  DEMO_TRANSCRIPT,
  ORDERS,
  PAYMENTS,
  POLICY_DOCS,
  SHIPMENTS,
} from "./mock-data";
import type {
  ClaimCase,
  ClaimFacts,
  CustomerHistory,
  DamageEvidence,
  EvidenceItem,
  OrderRecord,
  PaymentEvidence,
  PaymentRecord,
  PolicyResult,
  ReceiptEvidence,
  Resolution,
  ResolutionAction,
  ShipmentRecord,
} from "./types";

const lower = (s: string) => s.toLowerCase();

export function transcribeClaim(input: string): string {
  const trimmed = input.trim();
  if (trimmed.length === 0) return DEMO_TRANSCRIPT;
  return trimmed;
}

export function extractClaimFacts(transcript: string): ClaimFacts {
  const t = lower(transcript);

  const issueTypes: ClaimFacts["issueTypes"] = [];
  if (/(crack|broke|broken|damag|dent|scratch|chip|split)/.test(t)) {
    issueTypes.push("damaged_item");
  }
  if (/(two charges|duplicate|charged twice|double charged|extra charge)/.test(t)) {
    issueTypes.push("duplicate_charge");
  }
  if (/(late|delayed|never arrived|haven't received|hasn't arrived)/.test(t)) {
    issueTypes.push("late_delivery");
  }
  if (/(wrong item|different item|not what i ordered)/.test(t)) {
    issueTypes.push("wrong_item");
  }
  if (/(missing|hardware|parts)/.test(t)) {
    issueTypes.push("missing_parts");
  }
  if (issueTypes.length === 0) issueTypes.push("other");

  let productMentioned = "unspecified item";
  const productMatch = t.match(
    /(dining chair|chair|sofa|couch|table|bed|desk|dresser|lamp|rug|mattress)/,
  );
  if (productMatch) productMentioned = productMatch[1];

  let damageDescription: string | undefined;
  const damageMatch = transcript.match(
    /(cracked\s+\w+|broken\s+\w+|damaged\s+\w+|scratch\s+\w+|dented\s+\w+|split\s+\w+|chipped\s+\w+)/i,
  );
  if (damageMatch) damageDescription = damageMatch[1];

  let urgency: ClaimFacts["urgency"] = "unknown";
  if (/(today|asap|right now|immediately|urgent)/.test(t)) urgency = "today";
  else if (/(this week|by friday|soon)/.test(t)) urgency = "this_week";
  else if (/(no rush|whenever|no hurry)/.test(t)) urgency = "no_rush";

  let deliveryTiming: string | undefined;
  if (/(yesterday)/.test(t)) deliveryTiming = "yesterday";
  else if (/(today)/.test(t)) deliveryTiming = "today";
  else if (/(last week)/.test(t)) deliveryTiming = "last week";
  else if (/(two days ago|2 days ago)/.test(t)) deliveryTiming = "two days ago";

  let customerSentiment: ClaimFacts["customerSentiment"] = "neutral";
  if (/(frustrat|annoyed|upset|disappoint)/.test(t)) customerSentiment = "frustrated";
  else if (/(furious|angry|mad|ridiculous|unacceptable)/.test(t)) customerSentiment = "angry";
  else if (/(confused|don't understand|not sure)/.test(t)) customerSentiment = "confused";
  else if (/(thanks|appreciate|please|kindly)/.test(t)) customerSentiment = "calm";
  if (issueTypes.includes("damaged_item") && issueTypes.includes("duplicate_charge") && customerSentiment === "neutral") {
    customerSentiment = "frustrated";
  }

  let requestedOutcome = "fix/refund/replacement";
  if (/(refund)/.test(t) && /(replac)/.test(t)) requestedOutcome = "refund + replacement";
  else if (/(refund)/.test(t)) requestedOutcome = "refund";
  else if (/(replac)/.test(t)) requestedOutcome = "replacement";
  else if (/(fix|repair)/.test(t)) requestedOutcome = "fix/repair";

  return {
    productMentioned,
    issueTypes,
    damageDescription,
    urgency,
    deliveryTiming,
    customerSentiment,
    requestedOutcome,
  };
}

export function inspectDamageEvidence(
  evidence?: EvidenceItem,
): DamageEvidence | undefined {
  if (!evidence) return undefined;
  if (evidence.isDemo) {
    return {
      damageDetected: true,
      damageType: "structural crack",
      severity: "high",
      visualSummary:
        "Cracked oak chair leg, ~6 inch fracture along the grain. Load-bearing failure.",
      recommendedPath: "replacement",
    };
  }
  // Real user upload — no vision model is wired in mock mode. Be honest about it.
  return {
    damageDetected: true,
    damageType: "unverified — visual inspection pending",
    severity: "medium",
    visualSummary: `Customer-supplied image (${evidence.label}). No vision model wired in this mode — wire Baseten Vision to actually inspect pixels.`,
    recommendedPath: "investigate",
  };
}

export function extractReceiptFacts(
  evidence?: EvidenceItem,
): ReceiptEvidence | undefined {
  if (!evidence) return undefined;
  if (evidence.isDemo) {
    return {
      orderId: "WF-20491",
      customerName: "Maya Chen",
      product: "Solid Oak Dining Chair",
      amount: 249.99,
    };
  }
  // Real upload — we can't OCR pixels in mock mode. Leave order id unknown.
  return undefined;
}

export function inspectPaymentEvidence(
  evidence?: EvidenceItem,
): PaymentEvidence | undefined {
  if (!evidence) return undefined;
  if (evidence.isDemo) {
    return {
      duplicateChargeLikely: true,
      amount: 249.99,
      duplicateCount: 2,
      summary:
        "Two captured payments of $249.99 found for the same order, separated by less than 60 seconds.",
    };
  }
  return {
    duplicateChargeLikely: false,
    amount: 0,
    duplicateCount: 0,
    summary: `Customer-supplied screenshot (${evidence.label}). No OCR model wired in this mode — wire Baseten Vision for real payment inspection.`,
  };
}

export function getOrder(orderId: string): OrderRecord | undefined {
  return ORDERS[orderId];
}

export function getPaymentStatus(orderId: string): PaymentRecord | undefined {
  return PAYMENTS[orderId];
}

export function getShipmentStatus(orderId: string): ShipmentRecord | undefined {
  return SHIPMENTS[orderId];
}

export function getCustomerHistory(
  customerId: string,
): CustomerHistory | undefined {
  return CUSTOMERS[customerId];
}

export function checkRefundPolicy(input: {
  facts?: ClaimFacts;
  damage?: DamageEvidence;
  order?: OrderRecord;
  payment?: PaymentRecord;
  customer?: CustomerHistory;
}): PolicyResult {
  const reasons: string[] = [];
  const cited: string[] = [];
  let eligible = true;

  if (input.damage?.damageDetected && input.order?.damagePolicyEligible) {
    reasons.push("Damaged delivery reported within return window");
    cited.push(POLICY_DOCS[0]);
  } else if (input.damage?.damageDetected && !input.order?.damagePolicyEligible) {
    eligible = false;
    reasons.push("Damage reported but order is not flagged eligible in system");
  }

  if (input.damage?.severity === "high") {
    reasons.push("Structural damage — replacement preferred over repair");
    cited.push(POLICY_DOCS[2]);
  }

  if (input.payment?.duplicateChargeDetected) {
    reasons.push("Duplicate captured payments detected — refund required");
    cited.push(POLICY_DOCS[1]);
  }

  const priorityHandling =
    input.customer?.loyaltyRisk === "high" ||
    (input.order?.customerTier === "Premium" &&
      (input.customer?.priorTickets ?? 0) >= 2);

  if (priorityHandling) {
    reasons.push("Premium customer with repeat contacts — priority handling");
    cited.push(POLICY_DOCS[3]);
  }

  if (!input.damage || !input.payment) {
    reasons.push("Some evidence missing — flag for soft review");
    cited.push(POLICY_DOCS[4]);
  }

  return { eligible, reasons, cited, priorityHandling };
}

export function calculateConfidence(input: {
  facts?: ClaimFacts;
  damage?: DamageEvidence;
  receipt?: ReceiptEvidence;
  payment?: PaymentEvidence;
  order?: OrderRecord;
  shipment?: ShipmentRecord;
  policy?: PolicyResult;
}): number {
  let score = 40;
  if (input.facts) score += 8;
  if (input.damage?.damageDetected) score += 14;
  if (input.receipt) score += 8;
  if (input.payment?.duplicateChargeLikely) score += 10;
  if (input.order) score += 6;
  if (input.shipment?.status === "Delivered") score += 4;
  if (input.policy?.eligible) score += 6;
  if (input.policy && !input.policy.eligible) score -= 12;
  return Math.max(20, Math.min(99, score));
}

export function generateResolution(input: {
  facts?: ClaimFacts;
  damage?: DamageEvidence;
  receipt?: ReceiptEvidence;
  payment?: PaymentEvidence;
  order?: OrderRecord;
  shipment?: ShipmentRecord;
  customer?: CustomerHistory;
  policy?: PolicyResult;
}): Resolution {
  const actions: ResolutionAction[] = [];
  const reasoning: string[] = [];
  const hasRealOrder = Boolean(input.order);

  if (input.payment?.duplicateChargeLikely) {
    actions.push({
      label: `Refund duplicate charge $${input.payment.amount.toFixed(2)}`,
      kind: "refund",
      amount: input.payment.amount,
    });
    reasoning.push(
      `Payment records show ${input.payment.duplicateCount} captured charges of $${input.payment.amount.toFixed(
        2,
      )}.`,
    );
  }

  if (input.damage?.damageDetected) {
    actions.push({
      label: `Offer free replacement for ${input.order?.product ?? "the damaged item"}`,
      kind: "replacement",
    });
    reasoning.push(
      `Damage evidence indicates ${input.damage.damageType} (${input.damage.severity} severity).`,
    );
  }

  if (input.order) {
    const deliveredAgo = input.shipment?.status === "Delivered" ? "recently" : "in transit";
    reasoning.push(
      `Order ${input.order.orderId} for ${input.order.customerName} was delivered ${deliveredAgo}.`,
    );
  }

  if (input.policy?.priorityHandling) {
    actions.push({
      label: "Prioritize case (premium customer · repeated contacts)",
      kind: "note",
    });
    reasoning.push("Premium customer with repeated prior contacts — priority queue.");
  }

  actions.push({
    label: "Create support ticket with evidence bundle",
    kind: "note",
  });

  if (input.policy && input.policy.cited.length > 0) {
    reasoning.push(
      `Policy citations: ${input.policy.cited.length} matching policy clause(s).`,
    );
  }

  const confidence = calculateConfidence(input);

  const risk: Resolution["risk"] =
    confidence >= 85 ? "low" : confidence >= 65 ? "medium" : "high";

  const customerName = input.order?.customerName?.split(" ")[0] ?? "there";
  const productPhrase = input.order?.product
    ? `your ${input.order.product.toLowerCase()}`
    : input.facts?.productMentioned
      ? `your ${input.facts.productMentioned.toLowerCase()}`
      : "your order";
  const damagedLine = input.damage?.damageDetected
    ? `I'm really sorry ${productPhrase} arrived damaged${
        input.payment?.duplicateChargeLikely
          ? " and that you were charged twice"
          : ""
      }.`
    : input.payment?.duplicateChargeLikely
      ? "I'm really sorry about the duplicate charge on your order."
      : "Thanks for reaching out about your order.";
  const customerReply = [
    `Hi ${customerName}, ${damagedLine}`,
    input.payment?.duplicateChargeLikely
      ? `I confirmed there's a duplicate captured payment of $${input.payment.amount.toFixed(
          2,
        )}, and I can start that refund right now.`
      : "",
    input.damage?.damageDetected && hasRealOrder
      ? `I can also arrange a free replacement for ${productPhrase}.`
      : "",
    !hasRealOrder
      ? "Could you share your order number so I can pull up the details and resolve this fully?"
      : "",
    "Thank you for your patience while we get this fixed for you.",
  ]
    .filter(Boolean)
    .join(" ");

  const ticketSummary = [
    `Customer ${input.order?.customerName ?? "unknown"} reported ${
      input.damage?.damageType ?? "an issue"
    }${
      input.payment?.duplicateChargeLikely ? " and possible duplicate charge" : ""
    } on order ${input.order?.orderId ?? "(no order id)"}.`,
    input.damage?.damageDetected
      ? `Evidence indicates ${input.damage.visualSummary.toLowerCase()}`
      : "",
    input.payment?.duplicateChargeLikely
      ? `Payment records show ${input.payment.duplicateCount} captured $${input.payment.amount.toFixed(
          2,
        )} transactions.`
      : "",
    `Recommended action: ${actions.map((a) => a.label).join("; ")}.`,
    `Confidence ${confidence}%. Priority: ${
      input.policy?.priorityHandling ? "high" : "normal"
    }.`,
  ]
    .filter(Boolean)
    .join(" ");

  const recommendationParts: string[] = [];
  if (input.damage?.damageDetected && hasRealOrder) {
    recommendationParts.push("Approve replacement");
  }
  if (input.payment?.duplicateChargeLikely) {
    recommendationParts.push("refund duplicate charge");
  }
  let recommendation: string;
  if (recommendationParts.length > 0) {
    recommendation = recommendationParts
      .map((p, i) => (i === 0 ? p : p.toLowerCase()))
      .join(" + ");
  } else if (input.damage?.damageDetected && !hasRealOrder) {
    recommendation = "Request order ID + escalate for human review";
    actions.push({
      label: "Ask customer for order number",
      kind: "note",
    });
    actions.push({
      label: "Escalate to senior support for visual review",
      kind: "escalate",
    });
  } else {
    recommendation = "Escalate to human reviewer";
    actions.push({
      label: "Escalate — insufficient evidence to auto-resolve",
      kind: "escalate",
    });
  }

  return {
    recommendation,
    confidence,
    risk,
    reasoning,
    actions,
    customerReply,
    ticketSummary,
  };
}

export function buildCaseEvidence(claim: ClaimCase) {
  const damageEv = claim.evidence.find((e) => e.kind === "damage");
  const receiptEv = claim.evidence.find((e) => e.kind === "receipt");
  const paymentEv = claim.evidence.find((e) => e.kind === "payment");
  return { damageEv, receiptEv, paymentEv };
}
