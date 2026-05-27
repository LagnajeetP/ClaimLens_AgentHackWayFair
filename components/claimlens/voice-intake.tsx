"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import {
  getSpeechRecognition,
  isSpeechRecognitionSupported,
  type SpeechRecognitionLike,
} from "@/lib/claimlens/speech";
import { DEMO_TRANSCRIPT } from "@/lib/claimlens/mock-data";
import {
  Button,
  Card,
  MicIcon,
  Pill,
  SparkIcon,
  StopIcon,
} from "./ui";

const noopSubscribe = () => () => {};

function useSpeechRecognitionSupported(): boolean {
  return useSyncExternalStore(
    noopSubscribe,
    () => isSpeechRecognitionSupported(),
    () => true,
  );
}

export function VoiceIntake({
  transcript,
  onChange,
}: {
  transcript: string;
  onChange: (next: string) => void;
}) {
  const [listening, setListening] = useState(false);
  const supportedFromEnv = useSpeechRecognitionSupported();
  const [unavailable, setUnavailable] = useState(false);
  const supported = supportedFromEnv && !unavailable;
  const [interim, setInterim] = useState("");
  const recRef = useRef<SpeechRecognitionLike | null>(null);
  const finalRef = useRef<string>("");

  useEffect(() => {
    return () => {
      try {
        recRef.current?.abort();
      } catch {}
    };
  }, []);

  useEffect(() => {
    finalRef.current = transcript;
  }, [transcript]);

  function start() {
    const rec = getSpeechRecognition();
    if (!rec) {
      setUnavailable(true);
      return;
    }
    recRef.current = rec;
    rec.onresult = (event) => {
      let interimText = "";
      let finalText = finalRef.current;
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const r = event.results[i];
        const text = r[0].transcript;
        if (r.isFinal) {
          finalText = `${finalText} ${text}`.trim();
        } else {
          interimText += text;
        }
      }
      finalRef.current = finalText;
      setInterim(interimText);
      onChange(finalText);
    };
    rec.onerror = () => {
      setListening(false);
    };
    rec.onend = () => {
      setListening(false);
      setInterim("");
    };
    try {
      rec.start();
      setListening(true);
    } catch {
      setListening(false);
    }
  }

  function stop() {
    try {
      recRef.current?.stop();
    } catch {}
    setListening(false);
  }

  function loadDemo() {
    finalRef.current = DEMO_TRANSCRIPT;
    onChange(DEMO_TRANSCRIPT);
    setInterim("");
  }

  function clearAll() {
    finalRef.current = "";
    onChange("");
    setInterim("");
  }

  return (
    <Card
      title="Voice intake"
      right={
        listening ? (
          <Pill tone="brand">
            <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-[#ff8a3d]" />
            Listening
          </Pill>
        ) : supported ? (
          <Pill tone="info">STT ready</Pill>
        ) : (
          <Pill tone="warn">No STT</Pill>
        )
      }
    >
      <div className="flex flex-wrap items-center gap-2">
        {!listening ? (
          <Button
            variant="primary"
            onClick={start}
            disabled={!supported}
            title={
              supported
                ? "Start voice claim"
                : "Voice recognition not supported in this browser"
            }
          >
            <MicIcon /> Start voice claim
          </Button>
        ) : (
          <Button variant="danger" onClick={stop}>
            <StopIcon /> Stop listening
          </Button>
        )}
        <Button variant="secondary" onClick={loadDemo}>
          <SparkIcon /> Use demo claim
        </Button>
        <Button variant="ghost" onClick={clearAll}>
          Clear
        </Button>
      </div>

      <div className="mt-4">
        <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-zinc-500">
          Live transcript
        </label>
        <textarea
          value={transcript + (interim ? ` ${interim}` : "")}
          onChange={(e) => {
            finalRef.current = e.target.value;
            onChange(e.target.value);
          }}
          rows={4}
          placeholder={
            supported
              ? "Hi, my chair arrived cracked yesterday..."
              : "Voice recognition is not supported in this browser. Type or use the demo claim."
          }
          className="w-full resize-none rounded-xl border border-zinc-800 bg-black/40 p-3 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-[#ff8a3d]/60 focus:ring-2 focus:ring-[#ff8a3d]/20"
        />
        {interim && (
          <p className="mt-1 text-xs italic text-zinc-500">interim: {interim}</p>
        )}
      </div>
    </Card>
  );
}
