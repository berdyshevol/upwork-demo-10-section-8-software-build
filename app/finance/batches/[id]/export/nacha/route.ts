import { NextResponse } from "next/server";
import { getBatchView } from "@/lib/db";
import { buildNacha } from "@/lib/nacha";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const view = getBatchView(Number(id));
  if (!view) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const rows = view.rows.map((r) => ({
    line: r.line,
    contract: r.contract,
    tenant: r.tenant,
    landlord: r.landlord,
  }));

  const content = buildNacha(view.batch, rows);
  return new NextResponse(content, {
    headers: {
      "Content-Type": "text/plain; charset=us-ascii",
      "Content-Disposition": `attachment; filename="LBHA-HAP-${view.batch.period}.ach"`,
    },
  });
}
