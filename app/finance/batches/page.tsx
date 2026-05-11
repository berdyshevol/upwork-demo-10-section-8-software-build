import Link from "next/link";
import { getBatchView, db } from "@/lib/db";

export const dynamic = "force-dynamic";

const PERIOD_LABEL: Record<string, string> = {
  "2026-11": "November 2026",
  "2026-10": "October 2026",
  "2026-09": "September 2026",
};

function money(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

export default function BatchesIndex() {
  // Ensure data is seeded for first visit.
  db();
  const view = getBatchView(1)!;
  const lineCount = view.rows.length;
  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">HAP Batches</h1>
          <p className="text-sm text-neutral-600">Long Beach HA — monthly housing assistance payments</p>
        </div>
        <Link href="/" className="text-sm text-neutral-500 hover:text-ink">← Home</Link>
      </div>

      <table className="w-full text-sm bg-white rounded-lg border border-neutral-200 overflow-hidden">
        <thead className="bg-neutral-50 text-neutral-500 text-left">
          <tr>
            <th className="px-4 py-2 font-medium">Period</th>
            <th className="px-4 py-2 font-medium">Lines</th>
            <th className="px-4 py-2 font-medium">Total</th>
            <th className="px-4 py-2 font-medium">Status</th>
            <th className="px-4 py-2"></th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-t border-neutral-100">
            <td className="px-4 py-3">
              <Link href="/finance/batches/1" className="font-medium hover:underline">
                {PERIOD_LABEL[view.batch.period] ?? view.batch.period}
              </Link>
            </td>
            <td className="px-4 py-3">{lineCount}</td>
            <td className="px-4 py-3 tabular-nums">{money(view.total)}</td>
            <td className="px-4 py-3">
              <StatusPill status={view.batch.status} />
            </td>
            <td className="px-4 py-3 text-right">
              <Link href="/finance/batches/1" className="text-accent hover:underline">Open →</Link>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const styles =
    status === "approved"
      ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
      : "bg-amber-50 text-amber-700 ring-amber-200";
  return (
    <span className={`inline-flex items-center text-xs px-2 py-0.5 rounded-full ring-1 ${styles}`}>
      {status}
    </span>
  );
}
