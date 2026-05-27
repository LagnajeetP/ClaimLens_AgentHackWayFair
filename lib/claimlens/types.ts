export type EvidenceKind = "damage" | "receipt" | "payment";

export type EvidenceItem = {
  kind: EvidenceKind;
  label: string;
  dataUrl?: string;
  note?: string;
  isDemo?: boolean;
};

export type ClaimFacts = {
  productMentioned: string;
  issueTypes: Array<
    | "damaged_item"
    | "duplicate_charge"
    | "late_delivery"
    | "wrong_item"
    | "missing_parts"
    | "other"
  >;
  damageDescription?: string;
  urgency: "today" | "this_week" | "no_rush" | "unknown";
  deliveryTiming?: string;
  customerSentiment:
    | "frustrated"
    | "calm"
    | "angry"
    | "confused"
    | "neutral";
  requestedOutcome: string;
};

export type DamageEvidence = {
  damageDetected: boolean;
  damageType: string;
  severity: "low" | "medium" | "high";
  visualSummary: string;
  recommendedPath: "replacement" | "repair" | "refund" | "investigate";
};

export type ReceiptEvidence = {
  orderId: string;
  customerName: string;
  product: string;
  amount: number;
};

export type PaymentEvidence = {
  duplicateChargeLikely: boolean;
  amount: number;
  duplicateCount: number;
  summary: string;
};

export type OrderRecord = {
  orderId: string;
  customerId: string;
  customerName: string;
  customerTier: "Standard" | "Plus" | "Premium";
  product: string;
  sku: string;
  price: number;
  deliveryDate: string;
  deliveryStatus: "Pending" | "InTransit" | "Delivered" | "Lost";
  warrantyWindowDays: number;
  returnWindowDays: number;
  damagePolicyEligible: boolean;
};

export type PaymentTransaction = {
  id: string;
  amount: number;
  status: "captured" | "pending" | "refunded" | "failed";
  capturedAt: string;
};

export type PaymentRecord = {
  orderId: string;
  transactions: PaymentTransaction[];
  duplicateChargeDetected: boolean;
};

export type ShipmentRecord = {
  orderId: string;
  carrier: string;
  status: "Pending" | "InTransit" | "Delivered" | "Lost";
  deliveredAt: string;
  proof: string;
};

export type CustomerHistory = {
  customerId: string;
  priorTickets: number;
  priorIssue: string;
  sentiment: "frustrated" | "calm" | "angry" | "confused" | "neutral";
  loyaltyRisk: "low" | "medium" | "high";
};

export type PolicyResult = {
  eligible: boolean;
  reasons: string[];
  cited: string[];
  priorityHandling: boolean;
};

export type ResolutionAction = {
  label: string;
  kind: "refund" | "replacement" | "credit" | "escalate" | "note";
  amount?: number;
};

export type Resolution = {
  recommendation: string;
  confidence: number;
  risk: "low" | "medium" | "high";
  reasoning: string[];
  actions: ResolutionAction[];
  customerReply: string;
  ticketSummary: string;
};

export type AgentStepId =
  | "listen"
  | "extract_facts"
  | "inspect_damage"
  | "extract_receipt"
  | "inspect_payment"
  | "lookup_order"
  | "check_shipping"
  | "check_policy"
  | "generate_resolution"
  | "draft_reply"
  | "create_ticket";

export type AgentStepStatus = "pending" | "running" | "done" | "warn" | "error";

export type AgentStep = {
  id: AgentStepId;
  title: string;
  detail?: string;
  status: AgentStepStatus;
  startedAt?: number;
  finishedAt?: number;
};

export type AuditLogEntry = {
  id: string;
  ts: number;
  message: string;
  kind: "info" | "evidence" | "tool" | "policy" | "decision" | "action";
};

export type ClaimCase = {
  transcript: string;
  evidence: EvidenceItem[];
  facts?: ClaimFacts;
  damage?: DamageEvidence;
  receipt?: ReceiptEvidence;
  payment?: PaymentEvidence;
  order?: OrderRecord;
  paymentRecord?: PaymentRecord;
  shipment?: ShipmentRecord;
  customer?: CustomerHistory;
  policy?: PolicyResult;
  resolution?: Resolution;
};
