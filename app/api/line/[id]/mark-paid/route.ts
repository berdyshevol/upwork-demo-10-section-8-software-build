import { NextResponse } from "next/server";
import { markPaid, undoPaid } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as { undo?: boolean };
  if (body.undo) {
    undoPaid(Number(id));
  } else {
    markPaid(Number(id));
  }
  return NextResponse.json({ ok: true });
}
