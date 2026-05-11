import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { ttpFormula } from "@/lib/calc";

export const dynamic = "force-dynamic";

export default async function TenantPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const s = db();
  const tenant = s.tenants.find((t) => t.id === Number(id));
  if (!tenant) notFound();
  const contract = s.contracts.find((c) => c.tenant_id === tenant.id);
  const unit = contract ? s.units.find((u) => u.id === contract.unit_id) : null;
  const f = ttpFormula(tenant.adj_monthly_income, tenant.gross_income, tenant.welfare_rent);

  return (
    <div className="max-w-[480px] bg-white border border-neutral-200 rounded-lg p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">{tenant.name}</h1>
        <Link href="/finance/batches/1" className="text-sm text-neutral-500 hover:text-ink">Close</Link>
      </div>
      <dl className="text-sm grid grid-cols-2 gap-y-2">
        <dt className="text-neutral-500">Code</dt><dd>{tenant.code}</dd>
        <dt className="text-neutral-500">Household size</dt><dd>{tenant.household_size}</dd>
        <dt className="text-neutral-500">Adj. monthly income</dt><dd>${tenant.adj_monthly_income.toLocaleString()}</dd>
        <dt className="text-neutral-500">Annual gross income</dt><dd>${tenant.gross_income.toLocaleString()}</dd>
        <dt className="text-neutral-500">Welfare rent</dt><dd>${tenant.welfare_rent.toLocaleString()}</dd>
        {unit && (<><dt className="text-neutral-500">Unit</dt><dd>{unit.address}</dd></>)}
      </dl>
      <div className="rounded-md bg-neutral-50 border border-neutral-200 p-3 text-xs text-neutral-700 space-y-1">
        <div className="font-medium text-neutral-800">TTP audit</div>
        <div>30% × adj. monthly = ${f.thirty}</div>
        <div>10% × gross / 12 = ${f.ten}</div>
        <div>welfare rent = ${f.welfareRent}</div>
        <div className="font-medium pt-1">TTP = ${f.ttp}</div>
      </div>
    </div>
  );
}
