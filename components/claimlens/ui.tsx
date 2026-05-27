"use client";

import type { ReactNode } from "react";

export function Card({
  title,
  subtitle,
  right,
  children,
  className = "",
}: {
  title?: string;
  subtitle?: string;
  right?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-2xl border border-zinc-800/80 bg-zinc-950/60 p-5 shadow-[0_0_0_1px_rgba(255,255,255,0.02)] backdrop-blur ${className}`}
    >
      {(title || right) && (
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            {title && (
              <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-200">
                {title}
              </h2>
            )}
            {subtitle && (
              <p className="mt-1 text-xs text-zinc-500">{subtitle}</p>
            )}
          </div>
          {right}
        </div>
      )}
      {children}
    </section>
  );
}

export function Pill({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "brand" | "success" | "warn" | "danger" | "info";
}) {
  const tones: Record<string, string> = {
    neutral: "border-zinc-700 bg-zinc-900 text-zinc-300",
    brand: "border-[#ff8a3d]/40 bg-[#ff8a3d]/10 text-[#ffb27a]",
    success: "border-emerald-700/40 bg-emerald-950/40 text-emerald-300",
    warn: "border-amber-700/40 bg-amber-950/40 text-amber-300",
    danger: "border-red-800/50 bg-red-950/40 text-red-300",
    info: "border-sky-800/40 bg-sky-950/40 text-sky-300",
  };
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wider ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

export function Button({
  children,
  onClick,
  type = "button",
  variant = "primary",
  disabled,
  className = "",
  title,
}: {
  children: ReactNode;
  onClick?: () => void;
  type?: "button" | "submit";
  variant?: "primary" | "secondary" | "ghost" | "danger" | "success";
  disabled?: boolean;
  className?: string;
  title?: string;
}) {
  const variants: Record<string, string> = {
    primary:
      "bg-gradient-to-b from-[#ff7a3a] to-[#ff5c28] text-black hover:from-[#ff8a4a] hover:to-[#ff6a35] shadow-[0_8px_24px_-12px_rgba(255,92,40,0.7)]",
    secondary:
      "border border-zinc-800 bg-zinc-900 text-zinc-100 hover:border-[#ff8a3d]/60 hover:text-[#ffb27a]",
    ghost:
      "border border-transparent text-zinc-400 hover:text-white hover:border-zinc-800",
    danger:
      "border border-red-900/60 bg-red-950/40 text-red-200 hover:bg-red-900/40",
    success:
      "border border-emerald-800/60 bg-emerald-950/40 text-emerald-200 hover:bg-emerald-900/40",
  };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-40 ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  );
}

export function ProgressBar({
  value,
  tone = "brand",
}: {
  value: number;
  tone?: "brand" | "success" | "warn" | "danger";
}) {
  const tones: Record<string, string> = {
    brand: "bg-gradient-to-r from-[#ff7a3a] to-[#ffb27a]",
    success: "bg-gradient-to-r from-emerald-500 to-emerald-300",
    warn: "bg-gradient-to-r from-amber-500 to-amber-300",
    danger: "bg-gradient-to-r from-red-500 to-red-300",
  };
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-900">
      <div
        className={`h-full rounded-full transition-all duration-500 ${tones[tone]}`}
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
      />
    </div>
  );
}

export function Spinner({ size = 14 }: { size?: number }) {
  return (
    <span
      className="inline-block animate-spin rounded-full border-2 border-zinc-700 border-t-[#ff8a3d]"
      style={{ width: size, height: size }}
    />
  );
}

export function CheckIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path
        d="M5 12.5l4.5 4.5L19 7.5"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function WarnIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path
        d="M12 9v4m0 4h.01M10.29 3.86l-8.18 14.18A2 2 0 0 0 3.83 21h16.34a2 2 0 0 0 1.72-2.96L13.71 3.86a2 2 0 0 0-3.42 0z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function MicIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect
        x="9"
        y="3"
        width="6"
        height="12"
        rx="3"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path
        d="M5 11a7 7 0 0 0 14 0M12 18v3M9 21h6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function StopIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <rect x="6" y="6" width="12" height="12" rx="2" />
    </svg>
  );
}

export function SparkIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path
        d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function SpeakerIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path
        d="M5 9v6h4l5 4V5L9 9H5z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M16 8.5a4 4 0 0 1 0 7M18.5 6a7.5 7.5 0 0 1 0 12"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function CopyIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect
        x="8"
        y="8"
        width="12"
        height="12"
        rx="2"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path
        d="M16 4H6a2 2 0 0 0-2 2v10"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
