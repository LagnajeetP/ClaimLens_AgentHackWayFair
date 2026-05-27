"use client";

import type { ClaimCase } from "@/lib/claimlens/types";
import { Pill } from "./ui";

function Row({
  label,
  value,
  tone,
}: {
  label: string;
  value: React.ReactNode;
  tone?: "neutral" | "brand" | "success" | "warn" | "danger" | "info";
}) {
  return (
    <div className="flex items-start justify-between gap-3 py-1.5">
      <span className="text-xs uppercase tracking-wider text-zinc-500">
        {label}
      </span>
      <div className="text-right text-sm text-zinc-200">
        {tone ? <Pill tone={tone}>{value}</Pill> : value}
      </div>
    </div>
  );
}

function Section({
  title,
  empty,
  children,
}: {
  title: string;
  empty?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-zinc-800/80 bg-black/30 p-3">
      <div className="mb-1 flex items-center justify-between">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
          {title}
        </div>
        {empty && <Pill tone="neutral">Pending</Pill>}
      </div>
      {children}
    </div>
  );
}

export function FactsPanel({ claim }: { claim: ClaimCase }) {
  const { facts, damage, receipt, payment, order, paymentRecord, shipment, customer, policy } = claim;

  return (
    <div>
      <div className="grid gap-3 md:grid-cols-2">
        <Section title="From voice" empty={!facts}>
          {facts ? (
            <>
              <Row label="Product" value={facts.productMentioned} />
              <Row
                label="Issues"
                value={facts.issueTypes.join(", ")}
                tone="info"
              />
              {facts.damageDescription && (
                <Row label="Damage" value={facts.damageDescription} />
              )}
              <Row
                label="Delivery"
                value={facts.deliveryTiming ?? "unknown"}
              />
              <Row
                label="Urgency"
                value={facts.urgency}
                tone={facts.urgency === "today" ? "warn" : "neutral"}
              />
              <Row
                label="Sentiment"
                value={facts.customerSentiment}
                tone={
                  facts.customerSentiment === "frustrated" ||
                  facts.customerSentiment === "angry"
                    ? "danger"
                    : "neutral"
                }
              />
              <Row label="Wants" value={facts.requestedOutcome} />
            </>
          ) : (
            <p className="text-xs text-zinc-600">Run the agent to extract facts.</p>
          )}
        </Section>

        <Section title="From damage image" empty={!damage}>
          {damage ? (
            <>
              <Row
                label="Damage"
                value={damage.damageDetected ? "detected" : "none"}
                tone={damage.damageDetected ? "danger" : "success"}
              />
              <Row label="Type" value={damage.damageType} />
              <Row
                label="Severity"
                value={damage.severity}
                tone={
                  damage.severity === "high"
                    ? "danger"
                    : damage.severity === "medium"
                      ? "warn"
                      : "neutral"
                }
              />
              <Row label="Path" value={damage.recommendedPath} tone="brand" />
              <p className="mt-2 rounded-md bg-zinc-950/60 p-2 text-[11px] text-zinc-400">
                {damage.visualSummary}
              </p>
            </>
          ) : (
            <p className="text-xs text-zinc-600">No damage image inspected yet.</p>
          )}
        </Section>

        <Section title="From receipt" empty={!receipt}>
          {receipt ? (
            <>
              <Row label="Order ID" value={receipt.orderId} tone="brand" />
              <Row label="Customer" value={receipt.customerName} />
              <Row label="Product" value={receipt.product} />
              <Row label="Amount" value={`$${receipt.amount.toFixed(2)}`} />
            </>
          ) : (
            <p className="text-xs text-zinc-600">No receipt parsed yet.</p>
          )}
        </Section>

        <Section title="From payment screenshot" empty={!payment}>
          {payment ? (
            <>
              <Row
                label="Duplicate"
                value={payment.duplicateChargeLikely ? "likely" : "no"}
                tone={payment.duplicateChargeLikely ? "danger" : "success"}
              />
              <Row label="Amount" value={`$${payment.amount.toFixed(2)}`} />
              <Row label="Captures" value={String(payment.duplicateCount)} />
              <p className="mt-2 rounded-md bg-zinc-950/60 p-2 text-[11px] text-zinc-400">
                {payment.summary}
              </p>
            </>
          ) : (
            <p className="text-xs text-zinc-600">No payment screenshot reviewed.</p>
          )}
        </Section>

        <Section title="Order record" empty={!order}>
          {order ? (
            <>
              <Row label="Order" value={order.orderId} tone="brand" />
              <Row label="Customer" value={order.customerName} />
              <Row label="Tier" value={order.customerTier} tone="info" />
              <Row label="Product" value={order.product} />
              <Row label="SKU" value={order.sku} />
              <Row label="Price" value={`$${order.price.toFixed(2)}`} />
              <Row
                label="Delivery"
                value={order.deliveryStatus}
                tone={order.deliveryStatus === "Delivered" ? "success" : "neutral"}
              />
              <Row
                label="Return window"
                value={`${order.returnWindowDays}d`}
              />
            </>
          ) : (
            <p className="text-xs text-zinc-600">No order matched yet.</p>
          )}
        </Section>

        <Section title="Payments & shipping" empty={!paymentRecord && !shipment}>
          {paymentRecord && (
            <>
              <Row
                label="Charges"
                value={`${paymentRecord.transactions.length}`}
                tone={paymentRecord.duplicateChargeDetected ? "danger" : "neutral"}
              />
              <Row
                label="Duplicate"
                value={paymentRecord.duplicateChargeDetected ? "yes" : "no"}
                tone={paymentRecord.duplicateChargeDetected ? "danger" : "success"}
              />
              <div className="mt-2 space-y-1 rounded-md bg-zinc-950/60 p-2">
                {paymentRecord.transactions.map((t) => (
                  <div
                    key={t.id}
                    className="flex items-center justify-between text-[11px] text-zinc-400"
                  >
                    <span className="font-mono">{t.id}</span>
                    <span>${t.amount.toFixed(2)}</span>
                    <span className="text-zinc-500">{t.status}</span>
                  </div>
                ))}
              </div>
            </>
          )}
          {shipment && (
            <div className="mt-3">
              <Row label="Carrier" value={shipment.carrier} />
              <Row
                label="Status"
                value={shipment.status}
                tone={shipment.status === "Delivered" ? "success" : "neutral"}
              />
              <p className="mt-1 text-[11px] text-zinc-500">{shipment.proof}</p>
            </div>
          )}
          {customer && (
            <div className="mt-3 border-t border-zinc-800 pt-2">
              <Row
                label="Prior tickets"
                value={String(customer.priorTickets)}
                tone={customer.priorTickets >= 2 ? "warn" : "neutral"}
              />
              <Row
                label="Loyalty risk"
                value={customer.loyaltyRisk}
                tone={
                  customer.loyaltyRisk === "high"
                    ? "danger"
                    : customer.loyaltyRisk === "medium"
                      ? "warn"
                      : "neutral"
                }
              />
              <p className="text-[11px] text-zinc-500">{customer.priorIssue}</p>
            </div>
          )}
        </Section>

        <Section title="Policy check" empty={!policy}>
          {policy ? (
            <>
              <Row
                label="Eligible"
                value={policy.eligible ? "yes" : "needs review"}
                tone={policy.eligible ? "success" : "warn"}
              />
              <Row
                label="Priority"
                value={policy.priorityHandling ? "yes" : "no"}
                tone={policy.priorityHandling ? "brand" : "neutral"}
              />
              <ul className="mt-2 space-y-1">
                {policy.reasons.map((r, i) => (
                  <li
                    key={i}
                    className="rounded-md bg-zinc-950/60 px-2 py-1 text-[11px] text-zinc-400"
                  >
                    • {r}
                  </li>
                ))}
              </ul>
              {policy.cited.length > 0 && (
                <div className="mt-2 text-[10px] uppercase tracking-wider text-zinc-600">
                  {policy.cited.length} policy clause(s) cited
                </div>
              )}
            </>
          ) : (
            <p className="text-xs text-zinc-600">Policy not yet checked.</p>
          )}
        </Section>
      </div>
    </div>
  );
}
