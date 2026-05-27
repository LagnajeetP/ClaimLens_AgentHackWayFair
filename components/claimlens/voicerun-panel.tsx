"use client";

import { useState, useSyncExternalStore } from "react";
import { Button, CopyIcon } from "./ui";

const noopSubscribe = () => () => {};

function useWebhookUrl(): string {
  return useSyncExternalStore(
    noopSubscribe,
    () =>
      typeof window === "undefined"
        ? ""
        : `${window.location.origin}/api/voicerun/webhook`,
    () => "",
  );
}

const PY_SNIPPET = `# voice_agent.py — minimal VoiceRun → ClaimLens bridge
# pip install voicerun-cli requests
import os, requests
from voicerun import Agent, on_transcript

CLAIMLENS_URL = os.environ["CLAIMLENS_URL"]  # e.g. https://your-app.vercel.app
SECRET = os.environ.get("VOICERUN_WEBHOOK_SECRET", "")

@on_transcript()
def handle(call, transcript: str):
    res = requests.post(
        f"{CLAIMLENS_URL}/api/voicerun/webhook",
        headers={
            "Authorization": f"Bearer {SECRET}",
            "Content-Type": "application/json",
        },
        json={
            "callId": call.id,
            "callerId": call.from_number,
            "transcript": transcript,
        },
        timeout=30,
    ).json()
    call.speak(res["reply"])  # TTS the agent reply back to the customer

Agent.run()
`;

export function VoicerunPanel() {
  const url = useWebhookUrl();
  const [copied, setCopied] = useState<"" | "url" | "snippet">("");

  function copy(value: string, which: "url" | "snippet") {
    navigator.clipboard?.writeText(value).then(() => {
      setCopied(which);
      window.setTimeout(() => setCopied(""), 1500);
    });
  }

  return (
    <div>
      <p className="mb-3 text-xs text-zinc-400">
        Production path: VoiceRun terminates the phone call and POSTs the live
        transcript to this webhook. ClaimLens replies; VoiceRun reads it back.
      </p>
      <div className="grid gap-3 lg:grid-cols-[1.1fr_1fr]">
        <div className="rounded-xl border border-zinc-800 bg-black/40 p-3">
          <div className="mb-1.5 flex items-center justify-between">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
              Inbound webhook URL
            </div>
            <button
              type="button"
              onClick={() => url && copy(url, "url")}
              className="inline-flex items-center gap-1 rounded-md border border-zinc-800 px-2 py-1 text-[11px] text-zinc-300 hover:border-[#ff8a3d]/60 hover:text-[#ffb27a]"
            >
              <CopyIcon size={12} /> {copied === "url" ? "Copied" : "Copy"}
            </button>
          </div>
          <code className="block break-all rounded-md bg-zinc-950/60 px-2 py-1.5 font-mono text-[11px] text-zinc-200">
            {url || "(detecting…)"}
          </code>
          <div className="mt-3 space-y-1.5 text-[11px] text-zinc-400">
            <p>
              <span className="text-zinc-300">Method:</span> POST · JSON
            </p>
            <p>
              <span className="text-zinc-300">Auth:</span> optional{" "}
              <code className="rounded bg-zinc-900 px-1">
                Authorization: Bearer ${"{"}VOICERUN_WEBHOOK_SECRET{"}"}
              </code>
            </p>
            <p>
              <span className="text-zinc-300">Body:</span>{" "}
              <code className="rounded bg-zinc-900 px-1">
                {`{ callId, callerId, transcript, evidence? }`}
              </code>
            </p>
            <p>
              <span className="text-zinc-300">Returns:</span>{" "}
              <code className="rounded bg-zinc-900 px-1">
                {`{ reply, recommendation, confidence, ticketSummary, actions }`}
              </code>
            </p>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              variant="secondary"
              onClick={() => url && window.open(url, "_blank")}
            >
              Open webhook GET
            </Button>
            <a
              href="https://voicerun.com/"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2 text-sm font-semibold text-zinc-100 hover:border-[#ff8a3d]/60 hover:text-[#ffb27a]"
            >
              VoiceRun docs ↗
            </a>
          </div>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-black/40 p-3">
          <div className="mb-1.5 flex items-center justify-between">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
              VoiceRun agent (Python)
            </div>
            <button
              type="button"
              onClick={() => copy(PY_SNIPPET, "snippet")}
              className="inline-flex items-center gap-1 rounded-md border border-zinc-800 px-2 py-1 text-[11px] text-zinc-300 hover:border-[#ff8a3d]/60 hover:text-[#ffb27a]"
            >
              <CopyIcon size={12} /> {copied === "snippet" ? "Copied" : "Copy"}
            </button>
          </div>
          <pre className="max-h-[280px] overflow-auto rounded-md bg-zinc-950/60 p-3 font-mono text-[11px] leading-relaxed text-zinc-200">
            {PY_SNIPPET}
          </pre>
          <p className="mt-2 text-[11px] text-zinc-500">
            Run with <code className="rounded bg-zinc-900 px-1">vr deploy</code>{" "}
            after <code className="rounded bg-zinc-900 px-1">vr setup</code>. The
            agent speaks the ClaimLens reply back to the caller in real time.
          </p>
        </div>
      </div>
    </div>
  );
}
