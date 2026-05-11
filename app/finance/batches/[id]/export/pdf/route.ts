import { NextResponse } from "next/server";
import { getBatchView } from "@/lib/db";
import { buildCheckRegisterPdf } from "@/lib/pdf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const view = getBatchView(Number(id));
  if (!view) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const payable = view.rows.filter((r) => r.line.status !== "stopped");
  const total = payable.reduce((a, r) => a + r.line.amount, 0);

  const lines: string[] = [];
  lines.push(`Long Beach Housing Authority`);
  lines.push(`Period: ${view.batch.period}    Lines: ${payable.length}    Total: $${total.toLocaleString()}`);
  lines.push("");
  lines.push(`Contract     Landlord                  Tenant                Amount    Status`);
  for (const r of payable) {
    const row = [
      r.contract.code.padEnd(12, " "),
      r.landlord.name.slice(0, 24).padEnd(25, " "),
      r.tenant.name.slice(0, 20).padEnd(21, " "),
      ("$" + r.line.amount.toLocaleString()).padStart(8, " "),
      "  " + r.line.status,
    ].join(" ");
    lines.push(row);
  }
  lines.push("");
  if (view.batch.approved_by) lines.push(`Approved by: ${view.batch.approved_by}`);
  if (view.batch.approved_at) lines.push(`Approved at: ${view.batch.approved_at}`);

  const pdf = buildCheckRegisterPdf(`Check Register — ${view.batch.period}`, lines);
  const ab = pdf.buffer.slice(pdf.byteOffset, pdf.byteOffset + pdf.byteLength) as ArrayBuffer;

  return new NextResponse(ab, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="LBHA-CheckRegister-${view.batch.period}.pdf"`,
    },
  });
}
