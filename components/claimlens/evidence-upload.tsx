"use client";

import { useRef } from "react";
import type { EvidenceItem, EvidenceKind } from "@/lib/claimlens/types";
import {
  DEMO_DAMAGE_NOTE,
  DEMO_PAYMENT_NOTE,
  DEMO_RECEIPT_NOTE,
} from "@/lib/claimlens/mock-data";
import { Card, Pill, SparkIcon } from "./ui";

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

const KIND_META: Record<
  EvidenceKind,
  { title: string; demoLabel: string; demoNote: string; emoji: string }
> = {
  damage: {
    title: "Damage photo",
    demoLabel: "demo-cracked-chair.png",
    demoNote: DEMO_DAMAGE_NOTE,
    emoji: "📸",
  },
  receipt: {
    title: "Receipt screenshot",
    demoLabel: "demo-receipt-WF-20491.png",
    demoNote: DEMO_RECEIPT_NOTE,
    emoji: "🧾",
  },
  payment: {
    title: "Payment screenshot",
    demoLabel: "demo-payment-duplicate.png",
    demoNote: DEMO_PAYMENT_NOTE,
    emoji: "💳",
  },
};

function EvidenceTile({
  kind,
  item,
  onChange,
}: {
  kind: EvidenceKind;
  item?: EvidenceItem;
  onChange: (item: EvidenceItem | undefined) => void;
}) {
  const meta = KIND_META[kind];
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    const dataUrl = await fileToDataUrl(file);
    onChange({ kind, label: file.name, dataUrl, note: undefined, isDemo: false });
  }

  function loadDemo() {
    onChange({
      kind,
      label: meta.demoLabel,
      note: meta.demoNote,
      isDemo: true,
    });
  }

  function clear() {
    onChange(undefined);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className="flex flex-col rounded-xl border border-zinc-800/80 bg-black/40 p-3">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg leading-none">{meta.emoji}</span>
          <span className="text-sm font-medium text-zinc-200">{meta.title}</span>
        </div>
        {item ? (
          item.isDemo ? (
            <Pill tone="brand">Demo</Pill>
          ) : (
            <Pill tone="success">Loaded</Pill>
          )
        ) : (
          <Pill tone="neutral">Empty</Pill>
        )}
      </div>

      <div className="relative flex min-h-[120px] flex-1 items-center justify-center overflow-hidden rounded-lg border border-dashed border-zinc-800 bg-zinc-950/50 p-3 text-center">
        {item?.dataUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.dataUrl}
            alt={item.label}
            className="max-h-32 w-auto rounded object-contain"
          />
        ) : item ? (
          <div className="text-xs text-zinc-400">
            <div className="text-zinc-300">{item.label}</div>
            {item.note && (
              <div className="mt-1 text-[11px] text-zinc-500">{item.note}</div>
            )}
          </div>
        ) : (
          <div className="text-[11px] text-zinc-600">
            Drop a file or load demo
          </div>
        )}
      </div>

      <div className="mt-2 flex flex-wrap gap-1.5">
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void handleFile(f);
          }}
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="rounded-lg border border-zinc-800 bg-zinc-900 px-2.5 py-1 text-[11px] font-medium text-zinc-300 hover:border-[#ff8a3d]/60 hover:text-[#ffb27a]"
        >
          Upload
        </button>
        <button
          type="button"
          onClick={loadDemo}
          className="inline-flex items-center gap-1 rounded-lg border border-[#ff8a3d]/30 bg-[#ff8a3d]/10 px-2.5 py-1 text-[11px] font-medium text-[#ffb27a] hover:bg-[#ff8a3d]/15"
        >
          <SparkIcon size={11} /> Load demo
        </button>
        {item && (
          <button
            type="button"
            onClick={clear}
            className="rounded-lg border border-transparent px-2.5 py-1 text-[11px] text-zinc-500 hover:text-zinc-200"
          >
            Clear
          </button>
        )}
      </div>
    </div>
  );
}

export function EvidenceUpload({
  evidence,
  onChange,
}: {
  evidence: EvidenceItem[];
  onChange: (next: EvidenceItem[]) => void;
}) {
  function setKind(kind: EvidenceKind, item: EvidenceItem | undefined) {
    const others = evidence.filter((e) => e.kind !== kind);
    onChange(item ? [...others, item] : others);
  }

  function loadAllDemo() {
    onChange(
      (["damage", "receipt", "payment"] as EvidenceKind[]).map((k) => ({
        kind: k,
        label: KIND_META[k].demoLabel,
        note: KIND_META[k].demoNote,
        isDemo: true,
      })),
    );
  }

  const byKind: Record<EvidenceKind, EvidenceItem | undefined> = {
    damage: evidence.find((e) => e.kind === "damage"),
    receipt: evidence.find((e) => e.kind === "receipt"),
    payment: evidence.find((e) => e.kind === "payment"),
  };

  return (
    <Card
      title="Evidence"
      right={
        <div className="flex items-center gap-2">
          <Pill tone="success">Vision · Kimi K2.6</Pill>
          <button
            type="button"
            onClick={loadAllDemo}
            className="inline-flex items-center gap-1 rounded-md border border-[#ff8a3d]/30 bg-[#ff8a3d]/10 px-2 py-1 text-[11px] font-medium text-[#ffb27a] hover:bg-[#ff8a3d]/15"
          >
            <SparkIcon size={11} /> All demo
          </button>
        </div>
      }
    >
      <p className="-mt-2 mb-3 text-[11px] text-zinc-500">
        Real uploads are inspected by Baseten Kimi-K2.6 vision. Demo uploads use
        scripted findings.
      </p>
      <div className="grid gap-3 sm:grid-cols-3">
        {(["damage", "receipt", "payment"] as EvidenceKind[]).map((k) => (
          <EvidenceTile
            key={k}
            kind={k}
            item={byKind[k]}
            onChange={(item) => setKind(k, item)}
          />
        ))}
      </div>
    </Card>
  );
}
