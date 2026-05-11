import { NextResponse } from "next/server";
import { getBatchView } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function csvField(v: string | number) {
  const s = String(v);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const view = getBatchView(Number(id));
  if (!view) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const header = [
    "contract_code",
    "tenant_code",
    "tenant_name",
    "unit_address",
    "landlord_code",
    "landlord_name",
    "gross_rent",
    "ttp",
    "hap_amount",
    "status",
    "settlement_date",
    "bank_ref",
  ];
  const lines = [header.join(",")];
  for (const r of view.rows) {
    // Stop-pay'd lines are excluded from the disbursement file.
    if (r.line.status === "stopped") continue;
    lines.push(
      [
        r.contract.code,
        r.tenant.code,
        r.tenant.name,
        r.unit.address,
        r.landlord.code,
        r.landlord.name,
        r.contract.gross_rent,
        r.contract.ttp,
        r.line.amount,
        r.line.status,
        r.line.settlement_date ?? "",
        r.line.bank_ref ?? "",
      ]
        .map(csvField)
        .join(","),
    );
  }
  const csv = lines.join("\n") + "\n";

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="LBHA-HAP-${view.batch.period}.csv"`,
    },
  });
}
