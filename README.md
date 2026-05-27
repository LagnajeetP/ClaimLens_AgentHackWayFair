# ClaimLens

> **Multimodal voice agent for refund and warranty resolution.**
> ClaimLens turns messy customer calls, damage photos, receipts, payment
> screenshots, and internal order records into one verified refund or
> warranty resolution.

**Track:** Agents for Customer Service & FinOps
**Sponsors:** Wayfair · Subconscious · Baseten · Cloudflare

---

## What it does

A customer service rep clicks the mic. The customer says:

> *"I ordered a dining chair and it arrived yesterday with a cracked leg.
> I also see two charges on my card for the same amount. I need this fixed today."*

ClaimLens then:

1. Transcribes the voice with the browser's Web Speech API (live transcript).
2. Extracts structured claim facts — product, issue types, sentiment, urgency.
3. Inspects the damage photo, receipt, and payment screenshot the rep uploaded.
4. Looks up the order, payment history, and shipment status in mock internal systems.
5. Checks refund / warranty policy and customer history.
6. Recommends an action (replacement + refund duplicate charge), with confidence and risk.
7. Drafts a warm, on-brand customer reply.
8. **Reads the reply aloud** via browser speech synthesis — true closed-loop voice.
9. Creates an internal ticket with the full evidence bundle.
10. Logs every tool call + human decision to an audit trail.

All 10 steps work **fully offline** with mock data. Flip the header toggle to
**Live · Baseten** and the agent calls Baseten Nemotron-120B for real
structured fact extraction and real resolution reasoning. The
**Polish with Subconscious** button on the reply rewrites it with TIM-Qwen3.6.
The **VoiceRun panel** exposes a webhook that real phone-call agents can POST
transcripts to and receive the agent's reply back.

---

## Quick start

```bash
pnpm install
cp .env.example .env.local
# (optional) edit .env.local and add SUBCONSCIOUS_API_KEY
pnpm dev
```

Open <http://localhost:3000>.

> Local demo mode runs without any API keys.

---

## Demo script (≈2 minutes)

1. Click **Load full demo** — fills the transcript and all three pieces of evidence.
   *(Or press the mic and read the demo claim out loud.)*
2. Flip the header toggle from **Mock** to **Live · Baseten**.
3. Click **Run ClaimLens agent**.
4. Watch the **Agent investigation** timeline run all 11 steps end-to-end.
   The audit log shows *"Facts extracted via Baseten Nemotron"* and
   *"Resolution reasoned by Baseten Nemotron-120B"*.
5. Point at the **Extracted facts & evidence** grid — voice, image, receipt,
   payment, order, shipping, customer history, policy — all populated.
6. Land on the **Recommended resolution**: *Replace the damaged dining chair
   and refund the duplicate charge · 95% confidence · low risk.*
7. Click **Polish with Subconscious** to rewrite the reply with TIM-Qwen3.6.
8. Click **Read aloud** — the browser speaks the reply in a support-agent voice.
9. Click **Approve replacement** and **Refund duplicate charge** — case becomes
   *Resolved* and the audit log captures both human decisions.
10. Scroll to the **Real customer calls · VoiceRun** panel — copy the webhook
    URL and the Python agent snippet for the production phone-call hand-off.

### Sponsor-by-sponsor proof points in the live demo

| Sponsor | What you'll point at | Evidence |
|---|---|---|
| **Subconscious** | Customer reply, after clicking *Polish with Subconscious* | Warm, on-brand rewrite from TIM-Qwen3.6 in ~2s |
| **Baseten** | Facts panel + recommendation, after toggling **Live · Baseten** | Nemotron-120B JSON output, schema-validated, in ~1.5s |
| **VoiceRun** | *Real customer calls · VoiceRun* panel | `/api/voicerun/webhook` accepts call transcript, returns drafted reply |
| **Wayfair** | Mock order / payment / shipping / customer / policy under `lib/claimlens/mock-data.ts` | Single-file swap for real internal APIs |

---

## Architecture

```
app/
  page.tsx                    -> renders <ClaimLens />
  api/
    chat/route.ts             (original starter chat route — kept)
    claim-polish/route.ts     Subconscious-polished customer reply (TIM-Qwen3.6)
    claim-extract/route.ts    Baseten Nemotron structured fact extraction
    claim-reason/route.ts     Baseten Nemotron resolution + reasoning
    voicerun/webhook/route.ts VoiceRun inbound transcript webhook

components/
  claimlens/
    claim-lens.tsx            top-level dashboard container + mode toggle
    voice-intake.tsx          mic + live transcript (Web Speech API)
    evidence-upload.tsx       damage / receipt / payment tiles
    agent-timeline.tsx        11-step investigation timeline
    facts-panel.tsx           structured facts grid
    resolution-panel.tsx      recommendation + reply + action buttons
    audit-log.tsx             append-only audit trail
    voicerun-panel.tsx        VoiceRun webhook URL + Python agent snippet
    ui.tsx                    Card / Pill / Button / icons

lib/
  claimlens/
    types.ts                  ClaimFacts, DamageEvidence, ..., AuditLogEntry
    mock-data.ts              orders, payments, shipping, customer, policy docs
    mock-tools.ts             transcribeClaim, extractClaimFacts, inspectDamageEvidence, ...
    agent-runner.ts           runMockClaimAgent — orchestrates the 11-step loop
    agent-client.ts           extractFactsWithBaseten, reasonResolutionWithBaseten, polishReplyWithSubconscious
    baseten.ts                OpenAI-compat provider for Nemotron-120B-A12B
    json-parse.ts             robust JSON extractor for LLM responses
    speech.ts                 Web Speech API helpers (STT + TTS)
```

The agent loop in `lib/claimlens/agent-runner.ts` is the heart of the demo. Each
step calls a mock tool, updates the timeline, and appends to the audit log via
streaming callbacks — so the UI feels live.

---

## Sponsor integration plan

The local mock mode proves the UX. Each sponsor maps cleanly to one layer:

| Sponsor | Where it plugs in | What it powers | Status |
|---|---|---|---|
| **Baseten** | `lib/claimlens/baseten.ts`, `app/api/claim-extract/route.ts`, `app/api/claim-reason/route.ts` | Nemotron-120B-A12B does structured fact extraction + resolution reasoning when the **Live** toggle is on | **wired** |
| **Subconscious** | `app/api/claim-polish/route.ts` | TIM-Qwen3.6 rewrites the drafted customer reply with empathy and brand voice | **wired** |
| **VoiceRun** | `app/api/voicerun/webhook/route.ts`, `components/claimlens/voicerun-panel.tsx` | Inbound webhook for real phone-call transcripts; agent reply returned as JSON for VoiceRun TTS | **endpoint live + Python snippet shipped** |
| **Cloudflare** | future: Worker host, KV/D1 case storage, R2 evidence blobs, Durable Objects for audit streams | Production runtime + persistence + multi-rep collaboration | placeholder |
| **Wayfair** | swap the `ORDERS`, `PAYMENTS`, `SHIPMENTS` mocks in `lib/claimlens/mock-data.ts` for real internal APIs | Real claims with real order data | placeholder |

Environment variables (`.env.example`):

```
SUBCONSCIOUS_API_KEY=
BASETEN_API_KEY=
CLOUDFLARE_ACCOUNT_ID=
CLOUDFLARE_API_TOKEN=
```

---

## How the agent works

Each step in `runMockClaimAgent` calls one tool, marks the step as running,
awaits the result, then marks it `done` (or `warn` if evidence was missing).
The browser drives this directly — no backend required for the demo.

```ts
await step("inspect_damage", "Inspecting damage evidence", () =>
  inspectDamageEvidence(damageEv),
);
```

The 11 steps:

```
listen → extract_facts → inspect_damage → extract_receipt →
inspect_payment → lookup_order → check_shipping → check_policy →
generate_resolution → draft_reply → create_ticket
```

`generate_resolution` ties everything together and produces:
- `recommendation` (string)
- `confidence` (0–99)
- `risk` (low/medium/high)
- `reasoning` (array of bullet points)
- `actions` (refund / replacement / note)
- `customerReply` (drafted text)
- `ticketSummary` (internal record)

---

## Voice & multimodal

- **Speech-to-text:** `window.SpeechRecognition || window.webkitSpeechRecognition`
  (Chrome/Edge). Falls back to a regular textarea elsewhere.
- **Text-to-speech:** `window.speechSynthesis` — used by **Read aloud**.
- **Image evidence:** uploaded files become data URLs and render inline.
  The mock inspector ignores pixels and returns scripted demo facts — swap to
  a Baseten-hosted vision model for the real inspection.

---

## What's *not* real (and what to swap)

| Mock | Real swap |
|---|---|
| `transcribeClaim` (echo) | Whisper API / Deepgram / browser STT (already wired) |
| `inspectDamageEvidence` | Baseten vision model (e.g. Llama-3.2-Vision, GPT-4o on Baseten) |
| `extractReceiptFacts` | Baseten OCR + structured extraction |
| `inspectPaymentEvidence` | Same vision pipeline + Stripe/Adyen rules |
| `getOrder` / `getPaymentStatus` / `getShipmentStatus` | Wayfair internal APIs |
| `generateResolution` | Subconscious TIM-Qwen3.6 with `response_format` JSON schema |
| `polishReplyWithSubconscious` | Already wired — set `SUBCONSCIOUS_API_KEY` |

---

## Future integrations

- **Real call-in audio** — VoiceRun (<https://voicerun.com>) to terminate phone
  calls and stream audio into Subconscious-driven STT.
- **Live agent assist** — show ClaimLens output to the human rep in real time
  while they're still on the phone.
- **Auto-escalation** — when confidence < 65%, route to a senior rep with the
  full evidence bundle pre-attached.
- **Audit export** — push the audit log to a finance/compliance system for
  every approved refund.

---

## Links

- Subconscious docs · <https://docs.subconscious.dev/overview>
- Baseten model APIs · <https://docs.baseten.co/inference/model-apis/overview>
- VoiceRun (real phone calls) · <https://voicerun.com>
- Vercel AI SDK agents · <https://ai-sdk.dev/docs/agents/overview>
