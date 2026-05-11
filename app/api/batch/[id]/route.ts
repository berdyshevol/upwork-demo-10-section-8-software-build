import { NextResponse } from "next/server";
import { getBatchView } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const view = getBatchView(Number(id));
  if (!view) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json(view);
}
