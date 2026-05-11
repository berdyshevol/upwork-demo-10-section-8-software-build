import { NextResponse } from "next/server";
import { db, seed, getBatchView } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  seed();
  return NextResponse.json({ ok: true, reseeded_at: new Date().toISOString() });
}

export async function GET() {
  // GET both reseeds (fresh demo) and returns the batch summary.
  seed();
  const view = getBatchView(1);
  const counts = {
    landlords: db().landlords.length,
    tenants: db().tenants.length,
    contracts: db().contracts.length,
    lines: db().lines.length,
  };
  return NextResponse.json({ ok: true, counts, total: view?.total });
}
