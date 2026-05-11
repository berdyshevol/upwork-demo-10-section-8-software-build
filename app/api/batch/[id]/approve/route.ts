import { NextResponse } from "next/server";
import { approveBatch, getBatchView } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  approveBatch(Number(id));
  return NextResponse.json(getBatchView(Number(id)));
}
