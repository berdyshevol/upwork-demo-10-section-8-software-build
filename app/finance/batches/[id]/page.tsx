import { notFound } from "next/navigation";
import { getBatchView } from "@/lib/db";
import BatchClient from "./BatchClient";

export const dynamic = "force-dynamic";

export default async function BatchDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const view = getBatchView(Number(id));
  if (!view) notFound();

  const initial = {
    batchId: view.batch.id,
    period: view.batch.period,
    status: view.batch.status,
    approvedBy: view.batch.approved_by ?? null,
    approvedAt: view.batch.approved_at ?? null,
    flags: view.flags,
    rows: view.rows.map((r) => ({
      lineId: r.line.id,
      contractId: r.contract.id,
      contractCode: r.contract.code,
      status: r.line.status,
      amount: r.line.amount,
      grossRent: r.contract.gross_rent,
      ttp: r.contract.ttp,
      paymentStandard: r.unit.payment_standard,
      utilityAllowance: r.unit.utility_allowance,
      tenant: { id: r.tenant.id, name: r.tenant.name, code: r.tenant.code, adj: r.tenant.adj_monthly_income, gross: r.tenant.gross_income },
      landlord: { id: r.landlord.id, name: r.landlord.name, code: r.landlord.code, w9_expires: r.landlord.w9_expires, ach_routing: r.landlord.ach_routing, ach_account: r.landlord.ach_account },
      unit: { id: r.unit.id, address: r.unit.address, bedrooms: r.unit.bedrooms },
      stopPayReason: r.line.stop_pay_reason ?? null,
      settlementDate: r.line.settlement_date ?? null,
      bankRef: r.line.bank_ref ?? null,
    })),
    total: view.total,
  };

  return <BatchClient initial={initial} />;
}
