"use client";

import { useCallback, useRef, useState } from "react";
import {
  initialTimeline,
  runMockClaimAgent,
} from "@/lib/claimlens/agent-runner";
import {
  extractFactsWithBaseten,
  inspectEvidenceWithBaseten,
  reasonResolutionWithBaseten,
} from "@/lib/claimlens/agent-client";
import type {
  AgentStep,
  AuditLogEntry,
  ClaimCase,
  EvidenceItem,
} from "@/lib/claimlens/types";
import { DEMO_TRANSCRIPT } from "@/lib/claimlens/mock-data";
import { AgentTimeline } from "./agent-timeline";
import { AuditLog } from "./audit-log";
import { EvidenceUpload } from "./evidence-upload";
import { FactsPanel } from "./facts-panel";
import { ResolutionPanel } from "./resolution-panel";
import { Button, SparkIcon } from "./ui";
import { VoiceIntake } from "./voice-intake";
import { VoicerunPanel } from "./voicerun-panel";

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

function Expander({
  title,
  hint,
  defaultOpen = false,
  children,
}: {
  title: string;
  hint?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  return (
    <details
      className="group rounded-2xl border border-zinc-800/80 bg-zinc-950/40 open:bg-zinc-950/60"
      open={defaultOpen}
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-3 text-sm text-zinc-200 hover:text-white">
        <div className="flex items-center gap-2">
          <svg
            className="h-3 w-3 text-zinc-500 transition group-open:rotate-90"
            viewBox="0 0 12 12"
            fill="currentColor"
          >
            <path d="M4 2l4 4-4 4z" />
          </svg>
          <span className="font-semibold uppercase tracking-wider text-[11px] text-zinc-300">
            {title}
          </span>
          {hint && <span className="text-[11px] text-zinc-500">· {hint}</span>}
        </div>
      </summary>
      <div className="border-t border-zinc-800/60 p-5">{children}</div>
    </details>
  );
}

export function ClaimLens() {
  const [transcript, setTranscript] = useState("");
  const [evidence, setEvidence] = useState<EvidenceItem[]>([]);
  const [steps, setSteps] = useState<AgentStep[]>(initialTimeline());
  const [claim, setClaim] = useState<ClaimCase>({ transcript: "", evidence: [] });
  const [running, setRunning] = useState(false);
  const [audit, setAudit] = useState<AuditLogEntry[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const [ticketStatus, setTicketStatus] = useState<string>("Open");
  const [mode, setMode] = useState<"mock" | "live">("mock");
  const [hasRun, setHasRun] = useState(false);
  const toastTimerRef = useRef<number | undefined>(undefined);

  const canRun = transcript.trim().length > 0 && !running;

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    if (toastTimerRef.current !== undefined) {
      window.clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = window.setTimeout(() => setToast(null), 2400);
  }, []);

  const addAudit = useCallback(
    (entry: AuditLogEntry | Omit<AuditLogEntry, "id" | "ts">) => {
      const full =
        "id" in entry && "ts" in entry
          ? entry
          : makeAudit(entry.message, entry.kind);
      setAudit((prev) => [...prev, full]);
    },
    [],
  );

  function loadFullDemo() {
    setTranscript(DEMO_TRANSCRIPT);
    setEvidence([
      {
        kind: "damage",
        label: "demo-cracked-chair.png",
        note: "Demo damage image loaded: cracked oak chair leg",
        isDemo: true,
      },
      {
        kind: "receipt",
        label: "demo-receipt-WF-20491.png",
        note: "Demo receipt loaded: order WF-20491",
        isDemo: true,
      },
      {
        kind: "payment",
        label: "demo-payment-duplicate.png",
        note: "Demo payment screenshot loaded: duplicate $249.99 charge",
        isDemo: true,
      },
    ]);
    showToast("Loaded demo claim + evidence");
  }

  async function handleRun() {
    if (!canRun) return;
    setRunning(true);
    setHasRun(true);
    setTicketStatus("Investigating");
    setSteps(initialTimeline());
    setAudit([]);
    setClaim({ transcript, evidence });
    try {
      await runMockClaimAgent(
        { transcript, evidence },
        {
          onStep: (step) => {
            setSteps((prev) =>
              prev.map((s) => (s.id === step.id ? { ...s, ...step } : s)),
            );
          },
          onAudit: (entry) => {
            setAudit((prev) => [...prev, entry]);
          },
          onCase: (next) => {
            setClaim(next);
          },
        },
        {
          mode,
          real: {
            // Vision inspection always runs when a real (non-demo) image is
            // uploaded, regardless of the Mock/Live LLM toggle.
            inspectDamage: (ev) => inspectEvidenceWithBaseten("damage", ev),
            extractReceipt: (ev) => inspectEvidenceWithBaseten("receipt", ev),
            inspectPayment: (ev) => inspectEvidenceWithBaseten("payment", ev),
            // Text-only LLM reasoning is gated on the Live toggle.
            ...(mode === "live"
              ? {
                  extractFacts: extractFactsWithBaseten,
                  generateResolution: reasonResolutionWithBaseten,
                }
              : {}),
          },
        },
      );
      setTicketStatus("Awaiting approval");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Agent run failed unexpectedly";
      addAudit({ message, kind: "info" } as AuditLogEntry);
      setTicketStatus("Error");
    } finally {
      setRunning(false);
    }
  }

  function handleReset() {
    setTranscript("");
    setEvidence([]);
    setSteps(initialTimeline());
    setClaim({ transcript: "", evidence: [] });
    setAudit([]);
    setTicketStatus("Open");
    setHasRun(false);
    showToast("New case");
  }

  function handleAction(
    action: "approve_replacement" | "refund_duplicate" | "escalate",
  ) {
    if (action === "approve_replacement") {
      addAudit({
        message: "Replacement approved by human",
        kind: "action",
      } as AuditLogEntry);
      setTicketStatus((prev) =>
        prev === "Refunded" ? "Resolved" : "Replacement approved",
      );
      showToast("Replacement approved");
    } else if (action === "refund_duplicate") {
      addAudit({
        message: "Duplicate refund approved by human",
        kind: "action",
      } as AuditLogEntry);
      setTicketStatus((prev) =>
        prev === "Replacement approved" ? "Resolved" : "Refunded",
      );
      showToast("Refund issued");
    } else if (action === "escalate") {
      addAudit({
        message: "Case escalated to human review",
        kind: "action",
      } as AuditLogEntry);
      setTicketStatus("Escalated");
      showToast("Escalated");
    }
  }

  const haveTranscript = transcript.trim().length > 0;
  const evidenceCount = evidence.length;

  return (
    <div className="relative min-h-full bg-[radial-gradient(70%_50%_at_50%_-10%,rgba(255,138,61,0.12),transparent_60%),linear-gradient(to_bottom,#000,#0a0a0a)]">
      <header className="sticky top-0 z-30 border-b border-zinc-900/80 bg-black/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#ff8a3d] to-[#ff5c28] text-black shadow-[0_8px_20px_-12px_rgba(255,92,40,0.7)]">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <circle
                  cx="11"
                  cy="11"
                  r="6"
                  stroke="currentColor"
                  strokeWidth="2.2"
                />
                <path
                  d="M16 16l5 5"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                />
              </svg>
            </div>
            <div className="leading-tight">
              <h1 className="text-base font-semibold tracking-tight text-white">
                ClaimLens
              </h1>
              <p className="text-[11px] text-zinc-500">
                Voice agent for refund & warranty resolution
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex rounded-full border border-zinc-800 bg-zinc-950 p-0.5 text-[11px]">
              <button
                type="button"
                onClick={() => setMode("mock")}
                disabled={running}
                className={`rounded-full px-3 py-1 font-medium transition ${
                  mode === "mock"
                    ? "bg-[#ff8a3d] text-black"
                    : "text-zinc-400 hover:text-white"
                }`}
                title="Local deterministic agent — fully offline"
              >
                Mock
              </button>
              <button
                type="button"
                onClick={() => setMode("live")}
                disabled={running}
                className={`rounded-full px-3 py-1 font-medium transition ${
                  mode === "live"
                    ? "bg-emerald-500 text-black"
                    : "text-zinc-400 hover:text-white"
                }`}
                title="Calls Baseten Nemotron-120B for live reasoning"
              >
                Live · Baseten
              </button>
            </div>
            {hasRun && (
              <button
                type="button"
                onClick={handleReset}
                className="rounded-full border border-transparent px-3 py-1 text-[11px] text-zinc-400 hover:border-zinc-800 hover:text-white"
                title="Clear and start a new case"
              >
                New case
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-4 px-6 py-6">
        {!hasRun && (
          <div className="rounded-2xl border border-zinc-800/80 bg-zinc-950/40 px-5 py-3 text-sm text-zinc-300">
            <span className="font-medium text-[#ffb27a]">Bring your own claim:</span>{" "}
            press the mic and describe a problem with a recent order, then add any
            evidence images. Or click{" "}
            <button
              type="button"
              onClick={loadFullDemo}
              className="font-medium text-[#ffb27a] underline-offset-2 hover:underline"
            >
              load demo
            </button>{" "}
            for the canned Maya Chen scenario.
          </div>
        )}

        <div className="grid gap-4 lg:grid-cols-2">
          <VoiceIntake transcript={transcript} onChange={setTranscript} />
          <EvidenceUpload evidence={evidence} onChange={setEvidence} />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-zinc-800/80 bg-zinc-950/60 px-5 py-3">
          <div className="flex items-center gap-3 text-[12px] text-zinc-400">
            <span
              className={`inline-flex h-1.5 w-1.5 rounded-full ${
                haveTranscript ? "bg-emerald-400" : "bg-zinc-700"
              }`}
            />
            <span>
              <span className="text-zinc-300">{haveTranscript ? "Transcript ready" : "No transcript"}</span>
              {haveTranscript && (
                <span className="text-zinc-600"> · {transcript.length} chars</span>
              )}
            </span>
            <span className="text-zinc-700">|</span>
            <span
              className={`inline-flex h-1.5 w-1.5 rounded-full ${
                evidenceCount > 0 ? "bg-emerald-400" : "bg-zinc-700"
              }`}
            />
            <span>
              <span className="text-zinc-300">
                {evidenceCount > 0
                  ? `${evidenceCount} evidence item${evidenceCount === 1 ? "" : "s"}`
                  : "No evidence"}
              </span>
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={loadFullDemo}>
              <SparkIcon /> Load demo
            </Button>
            <Button
              variant="primary"
              onClick={handleRun}
              disabled={!canRun}
              title={
                !haveTranscript
                  ? "Add a transcript first — press the mic or load the demo"
                  : "Run the ClaimLens agent"
              }
            >
              {running ? "Running…" : "Run ClaimLens agent"}
            </Button>
          </div>
        </div>

        {hasRun && (
          <>
            <div className="grid gap-4 lg:grid-cols-[1fr_1.6fr]">
              <AgentTimeline steps={steps} />
              <ResolutionPanel
                resolution={claim.resolution}
                transcript={transcript}
                ticketStatus={ticketStatus}
                onAction={handleAction}
                onAudit={addAudit}
              />
            </div>

            <Expander
              title="Investigation details"
              hint="all extracted facts, evidence findings, order, payments, policy"
            >
              <FactsPanel claim={claim} />
            </Expander>

            <Expander
              title="Audit log"
              hint={`${audit.length} entries`}
            >
              <AuditLog entries={audit} />
            </Expander>
          </>
        )}

        <Expander
          title="Production wiring · VoiceRun"
          hint="real phone-call webhook + Python agent snippet"
        >
          <VoicerunPanel />
        </Expander>

        <footer className="pb-6 pt-2 text-center text-[10px] text-zinc-700">
          ClaimLens · Wayfair × Subconscious × Baseten × Cloudflare × VoiceRun
        </footer>
      </main>

      {toast && (
        <div className="pointer-events-none fixed bottom-6 left-1/2 z-50 -translate-x-1/2">
          <div className="rounded-full border border-[#ff8a3d]/40 bg-black/90 px-4 py-2 text-sm text-[#ffb27a] shadow-2xl">
            {toast}
          </div>
        </div>
      )}
    </div>
  );
}
