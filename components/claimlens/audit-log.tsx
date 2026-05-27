"use client";

import type { AuditLogEntry } from "@/lib/claimlens/types";
import { Pill } from "./ui";

function formatTime(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  });
}

const KIND_TONE: Record<AuditLogEntry["kind"], "neutral" | "brand" | "success" | "warn" | "danger" | "info"> = {
  info: "neutral",
  evidence: "info",
  tool: "brand",
  policy: "warn",
  decision: "brand",
  action: "success",
};

export function AuditLog({ entries }: { entries: AuditLogEntry[] }) {
  if (entries.length === 0) {
    return (
      <div className="flex h-24 items-center justify-center rounded-xl border border-dashed border-zinc-800 text-sm text-zinc-600">
        No activity yet. Run the agent to see audit entries.
      </div>
    );
  }
  return (
    <ul className="max-h-72 space-y-1.5 overflow-y-auto pr-1">
      {[...entries].reverse().map((e) => (
        <li
          key={e.id}
          className="flex items-center justify-between gap-2 rounded-lg border border-zinc-800/60 bg-black/30 px-3 py-1.5 text-xs"
        >
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] text-zinc-500">
              {formatTime(e.ts)}
            </span>
            <span className="text-zinc-200">{e.message}</span>
          </div>
          <Pill tone={KIND_TONE[e.kind]}>{e.kind}</Pill>
        </li>
      ))}
    </ul>
  );
}
