import { NextResponse } from "next/server";
import { stopPayLine, reverseStopPay } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as { reason?: string; reverse?: boolean };
  if (body.reverse) {
    reverseStopPay(Number(id));
  } else {
    stopPayLine(Number(id), body.reason ?? "No reason provided");
  }
  return NextResponse.json({ ok: true });
}
