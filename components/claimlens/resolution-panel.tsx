"use client";

import { useState } from "react";
import type { AuditLogEntry, Resolution } from "@/lib/claimlens/types";
import { isSpeechSynthesisSupported, speak, stopSpeaking } from "@/lib/claimlens/speech";
import { polishReplyWithSubconscious } from "@/lib/claimlens/agent-client";
import {
  Button,
  Card,
  CopyIcon,
  Pill,
  ProgressBar,
  SparkIcon,
  SpeakerIcon,
} from "./ui";

type Action = "approve_replacement" | "refund_duplicate" | "escalate";

export function ResolutionPanel({
  resolution,
  transcript,
  ticketStatus,
  onAction,
  onAudit,
}: {
  resolution?: Resolution;
  transcript: string;
  ticketStatus: string;
  onAction: (a: Action) => void;
  onAudit: (entry: Omit<AuditLogEntry, "id" | "ts">) => void;
}) {
  const [copied, setCopied] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [polishedReply, setPolishedReply] = useState<string | null>(null);
  const [polishSource, setPolishSource] = useState<"mock" | "subconscious" | null>(
    null,
  );
  const [polishing, setPolishing] = useState(false);
  const [lastDraft, setLastDraft] = useState<string | undefined>(
    resolution?.customerReply,
  );

  if (lastDraft !== resolution?.customerReply) {
    setLastDraft(resolution?.customerReply);
    setPolishedReply(null);
    setPolishSource(null);
  }

  if (!resolution) {
    return (
      <Card
        title="Recommended resolution"
        subtitle="Will populate after the agent finishes investigating."
      >
        <div className="flex h-32 items-center justify-center rounded-xl border border-dashed border-zinc-800 text-sm text-zinc-600">
          No recommendation yet.
        </div>
      </Card>
    );
  }

  const confidence = resolution.confidence;
  const tone =
    resolution.risk === "low"
      ? "success"
      : resolution.risk === "medium"
        ? "warn"
        : "danger";
  const replyText = polishedReply ?? resolution.customerReply;

  function handleCopy() {
    navigator.clipboard
      ?.writeText(replyText)
      .then(() => {
        setCopied(true);
        onAudit({ message: "Customer reply copied to clipboard", kind: "action" });
        setTimeout(() => setCopied(false), 1500);
      })
      .catch(() => {});
  }

  function handleSpeak() {
    if (!isSpeechSynthesisSupported()) {
      onAudit({
        message: "Speech synthesis unavailable in this browser",
        kind: "info",
      });
      return;
    }
    if (speaking) {
      stopSpeaking();
      setSpeaking(false);
      return;
    }
    speak(replyText);
    setSpeaking(true);
    onAudit({ message: "Reading customer response aloud", kind: "action" });
    setTimeout(() => setSpeaking(false), 12000);
  }

  async function handlePolish() {
    if (!resolution || polishing) return;
    setPolishing(true);
    onAudit({ message: "Polishing reply with Subconscious", kind: "tool" });
    const result = await polishReplyWithSubconscious({
      reply: resolution.customerReply,
      transcript,
      resolution,
    });
    setPolishedReply(result.reply);
    setPolishSource(result.source);
    onAudit({
      message:
        result.source === "subconscious"
          ? "Reply polished by Subconscious TIM-Qwen3.6"
          : "Subconscious unavailable — kept mock reply",
      kind: result.source === "subconscious" ? "decision" : "info",
    });
    setPolishing(false);
  }

  return (
    <Card
      title="Recommended resolution"
      subtitle="Agent's structured recommendation with confidence and audit trail."
      right={
        ticketStatus === "Escalated" ? (
          <Pill tone="warn">Escalated to human</Pill>
        ) : ticketStatus === "Resolved" ? (
          <Pill tone="success">Resolved</Pill>
        ) : (
          <Pill tone="brand">Awaiting approval</Pill>
        )
      }
    >
      <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <div className="rounded-xl border border-[#ff8a3d]/30 bg-gradient-to-br from-[#ff8a3d]/10 to-transparent p-4">
          <div className="mb-2 flex items-center gap-2">
            <Pill tone="brand">Recommendation</Pill>
            <Pill tone={tone}>{resolution.risk} risk</Pill>
          </div>
          <p className="text-lg font-semibold text-white">
            {resolution.recommendation}
          </p>

          <div className="mt-4">
            <div className="mb-1 flex items-center justify-between text-xs">
              <span className="text-zinc-400">Confidence</span>
              <span className="font-semibold text-white">{confidence}%</span>
            </div>
            <ProgressBar
              value={confidence}
              tone={
                confidence >= 85 ? "success" : confidence >= 65 ? "brand" : "warn"
              }
            />
          </div>

          <div className="mt-4">
            <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
              Reasoning
            </div>
            <ul className="space-y-1">
              {resolution.reasoning.map((r, i) => (
                <li
                  key={i}
                  className="rounded-md bg-black/30 px-2 py-1 text-xs text-zinc-300"
                >
                  • {r}
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-4">
            <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
              Recommended actions
            </div>
            <ul className="space-y-1">
              {resolution.actions.map((a, i) => (
                <li
                  key={i}
                  className="flex items-center justify-between rounded-md bg-black/30 px-2 py-1.5 text-xs text-zinc-200"
                >
                  <span>{a.label}</span>
                  <Pill
                    tone={
                      a.kind === "refund"
                        ? "success"
                        : a.kind === "replacement"
                          ? "brand"
                          : a.kind === "escalate"
                            ? "warn"
                            : "neutral"
                    }
                  >
                    {a.kind}
                  </Pill>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border border-zinc-800 bg-black/40 p-4">
            <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                  Customer reply draft
                </div>
                {polishSource === "subconscious" && (
                  <Pill tone="brand">Polished · Subconscious</Pill>
                )}
                {polishSource === "mock" && (
                  <Pill tone="warn">Subconscious offline · using mock</Pill>
                )}
              </div>
              <div className="flex flex-wrap gap-1">
                <button
                  type="button"
                  onClick={handlePolish}
                  disabled={polishing}
                  className="inline-flex items-center gap-1 rounded-md border border-[#ff8a3d]/40 bg-[#ff8a3d]/10 px-2 py-1 text-[11px] text-[#ffb27a] hover:bg-[#ff8a3d]/15 disabled:opacity-50"
                >
                  <SparkIcon size={12} />{" "}
                  {polishing ? "Polishing…" : "Polish with Subconscious"}
                </button>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="inline-flex items-center gap-1 rounded-md border border-zinc-800 px-2 py-1 text-[11px] text-zinc-300 hover:border-[#ff8a3d]/60 hover:text-[#ffb27a]"
                >
                  <CopyIcon size={12} /> {copied ? "Copied" : "Copy"}
                </button>
                <button
                  type="button"
                  onClick={handleSpeak}
                  className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] ${
                    speaking
                      ? "border-[#ff8a3d]/60 bg-[#ff8a3d]/10 text-[#ffb27a]"
                      : "border-zinc-800 text-zinc-300 hover:border-[#ff8a3d]/60 hover:text-[#ffb27a]"
                  }`}
                >
                  <SpeakerIcon size={12} /> {speaking ? "Stop" : "Read aloud"}
                </button>
              </div>
            </div>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-100">
              {replyText}
            </p>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-black/40 p-4">
            <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
              Internal ticket summary
            </div>
            <p className="text-xs leading-relaxed text-zinc-300">
              {resolution.ticketSummary}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              variant="success"
              onClick={() => onAction("approve_replacement")}
            >
              Approve replacement
            </Button>
            <Button variant="success" onClick={() => onAction("refund_duplicate")}>
              Refund duplicate charge
            </Button>
            <Button variant="danger" onClick={() => onAction("escalate")}>
              Escalate to human
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
