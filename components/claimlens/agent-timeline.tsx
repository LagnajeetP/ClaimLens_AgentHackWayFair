"use client";

import type { AgentStep } from "@/lib/claimlens/types";
import { Card, CheckIcon, Pill, Spinner, WarnIcon } from "./ui";

function StepRow({ step, last }: { step: AgentStep; last: boolean }) {
  const isRunning = step.status === "running";
  const isDone = step.status === "done";
  const isWarn = step.status === "warn";
  const isError = step.status === "error";

  return (
    <li className="relative flex gap-3 pb-4">
      {!last && (
        <span
          aria-hidden
          className={`absolute left-[11px] top-6 bottom-0 w-px ${
            isDone ? "bg-emerald-800/60" : "bg-zinc-800"
          }`}
        />
      )}
      <span
        className={`mt-0.5 inline-flex h-[22px] w-[22px] flex-none items-center justify-center rounded-full border ${
          isDone
            ? "border-emerald-700/60 bg-emerald-950/60 text-emerald-300"
            : isRunning
              ? "border-[#ff8a3d]/60 bg-[#ff8a3d]/10 text-[#ffb27a]"
              : isWarn
                ? "border-amber-700/60 bg-amber-950/60 text-amber-300"
                : isError
                  ? "border-red-800/60 bg-red-950/60 text-red-300"
                  : "border-zinc-800 bg-zinc-950 text-zinc-600"
        }`}
      >
        {isRunning ? (
          <Spinner size={10} />
        ) : isDone ? (
          <CheckIcon size={12} />
        ) : isWarn || isError ? (
          <WarnIcon size={12} />
        ) : (
          <span className="h-1.5 w-1.5 rounded-full bg-zinc-700" />
        )}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span
            className={`text-sm ${
              isDone || isWarn
                ? "text-zinc-200"
                : isRunning
                  ? "text-white"
                  : "text-zinc-500"
            }`}
          >
            {step.title}
          </span>
          {isRunning && <Pill tone="brand">Running</Pill>}
          {isWarn && <Pill tone="warn">Soft warn</Pill>}
          {isError && <Pill tone="danger">Error</Pill>}
        </div>
        {step.detail && (
          <p className="mt-0.5 text-xs text-zinc-500">{step.detail}</p>
        )}
      </div>
    </li>
  );
}

export function AgentTimeline({ steps }: { steps: AgentStep[] }) {
  const doneCount = steps.filter((s) => s.status === "done" || s.status === "warn").length;
  const total = steps.length;
  const allIdle = steps.every((s) => s.status === "pending");

  return (
    <Card
      title="Agent investigation"
      subtitle="Step-by-step tool calls the agent runs on this claim."
      right={
        allIdle ? (
          <Pill tone="neutral">Idle</Pill>
        ) : doneCount === total ? (
          <Pill tone="success">Complete</Pill>
        ) : (
          <Pill tone="brand">
            {doneCount}/{total}
          </Pill>
        )
      }
    >
      <ol className="m-0 list-none p-0">
        {steps.map((s, i) => (
          <StepRow key={s.id} step={s} last={i === steps.length - 1} />
        ))}
      </ol>
    </Card>
  );
}
