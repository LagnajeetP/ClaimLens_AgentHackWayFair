import { inspectImageOnBaseten } from "@/lib/claimlens/vision-server";

export const maxDuration = 60;

export async function POST(req: Request) {
  let body: { kind?: string; dataUrl?: string; label?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const kind = body.kind as "damage" | "receipt" | "payment" | undefined;
  if (!kind || !["damage", "receipt", "payment"].includes(kind)) {
    return Response.json(
      { error: "kind must be 'damage', 'receipt', or 'payment'" },
      { status: 400 },
    );
  }
  if (!body.dataUrl) {
    return Response.json({ error: "dataUrl is required" }, { status: 400 });
  }

  const out = await inspectImageOnBaseten(kind, body.dataUrl);
  if ("error" in out) {
    return Response.json({ error: out.error }, { status: 502 });
  }
  return Response.json(out);
}
