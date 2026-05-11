import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function LandlordPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const s = db();
  const ll = s.landlords.find((l) => l.id === Number(id));
  if (!ll) notFound();
  const units = s.units.filter((u) => u.landlord_id === ll.id);
  const expired = new Date(ll.w9_expires) < new Date("2026-11-01");

  return (
    <div className="max-w-[480px] bg-white border border-neutral-200 rounded-lg p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">{ll.name}</h1>
        <Link href="/finance/batches/1" className="text-sm text-neutral-500 hover:text-ink">Close</Link>
      </div>
      <dl className="text-sm grid grid-cols-2 gap-y-2">
        <dt className="text-neutral-500">Code</dt><dd>{ll.code}</dd>
        <dt className="text-neutral-500">EIN</dt><dd>{ll.ein}</dd>
        <dt className="text-neutral-500">W-9 expires</dt>
        <dd className={expired ? "text-red-600 font-medium" : ""}>
          {ll.w9_expires}{expired && " — EXPIRED"}
        </dd>
        <dt className="text-neutral-500">ACH routing</dt>
        <dd className={!ll.ach_routing ? "text-red-600 font-medium" : ""}>
          {ll.ach_routing || "— missing —"}
        </dd>
        <dt className="text-neutral-500">ACH account</dt>
        <dd className={!ll.ach_account ? "text-red-600 font-medium" : ""}>
          {ll.ach_account ? `••••${ll.ach_account.slice(-4)}` : "— missing —"}
        </dd>
      </dl>
      <div className="text-xs text-neutral-500">
        <div className="font-medium text-neutral-700 mb-1">Units ({units.length})</div>
        <ul className="space-y-1">
          {units.map((u) => (
            <li key={u.id}>{u.address}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
