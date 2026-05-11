"use client";

import { useState, useTransition, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Row = {
  lineId: number;
  contractId: number;
  contractCode: string;
  status: "pending" | "approved" | "paid" | "stopped";
  amount: number;
  grossRent: number;
  ttp: number;
  paymentStandard: number;
  utilityAllowance: number;
  tenant: { id: number; name: string; code: string; adj: number; gross: number };
  landlord: { id: number; name: string; code: string; w9_expires: string; ach_routing: string; ach_account: string };
  unit: { id: number; address: string; bedrooms: number };
  stopPayReason: string | null;
  settlementDate: string | null;
  bankRef: string | null;
};

type Flag = {
  line_id: number;
  contract_code: string;
  landlord_name: string;
  kind: "expired_w9" | "missing_banking" | "failed_inspection" | "abated_unit";
  message: string;
};

type Initial = {
  batchId: number;
  period: string;
  status: "draft" | "approved";
  approvedBy: string | null;
  approvedAt: string | null;
  flags: Flag[];
  rows: Row[];
  total: number;
};

function money(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

function periodLabel(p: string) {
  const [y, m] = p.split("-");
  const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  return `${months[Number(m) - 1]} ${y}`;
}

export default function BatchClient({ initial }: { initial: Initial }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [acknowledged, setAcknowledged] = useState(false);
  const [stopPayFor, setStopPayFor] = useState<Row | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const isApproved = initial.status === "approved";
  const flagsBlocking = initial.flags.length > 0 && !acknowledged && !isApproved;
  const payableTotal = useMemo(
    () => initial.rows.filter((r) => r.status !== "stopped").reduce((a, r) => a + r.amount, 0),
    [initial.rows],
  );

  async function call(url: string, body?: unknown) {
    setBusy(true);
    try {
      await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
      });
      startTransition(() => router.refresh());
    } finally {
      setBusy(false);
    }
  }

  function triggerDownload(href: string) {
    // Stays on page; the response is Content-Disposition: attachment.
    window.location.href = href;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <div className="text-xs uppercase tracking-[0.18em] text-accent font-medium">HAP Batch</div>
          <h1 className="text-2xl font-semibold tracking-tight">{periodLabel(initial.period)}</h1>
          <p className="text-sm text-neutral-600">
            {initial.rows.length} lines · Payable total{" "}
            <span data-testid="batch-total" className="font-medium text-ink tabular-nums">
              {money(payableTotal)}
            </span>
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span data-testid="batch-status" className={isApproved ? "inline-flex items-center text-xs px-2 py-0.5 rounded-full ring-1 bg-emerald-50 text-emerald-700 ring-emerald-200" : "inline-flex items-center text-xs px-2 py-0.5 rounded-full ring-1 bg-amber-50 text-amber-700 ring-amber-200"}>
            {isApproved ? "approved" : "draft"}
          </span>
          <Link href="/finance/batches" className="text-sm text-neutral-500 hover:text-ink">← All batches</Link>
        </div>
      </div>

      {/* Validator panel */}
      <ValidatorPanel
        flags={initial.flags}
        acknowledged={acknowledged}
        onAcknowledge={() => setAcknowledged(true)}
        isApproved={isApproved}
      />

      {/* Approve + export controls */}
      <div className="rounded-lg border border-neutral-200 bg-white p-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={busy || flagsBlocking || isApproved}
          onClick={() => call(`/api/batch/${initial.batchId}/approve`)}
          className="rounded-md bg-ink text-white px-4 py-2 text-sm font-medium hover:bg-neutral-800 disabled:bg-neutral-300 disabled:cursor-not-allowed"
        >
          Approve Batch
        </button>

        <div className="flex items-center gap-2 ml-auto">
          <button
            type="button"
            disabled={!isApproved}
            onClick={() => triggerDownload(`/finance/batches/${initial.batchId}/export/nacha`)}
            className="rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm hover:bg-neutral-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Export NACHA (.ach)
          </button>
          <button
            type="button"
            disabled={!isApproved}
            onClick={() => triggerDownload(`/finance/batches/${initial.batchId}/export/csv`)}
            className="rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm hover:bg-neutral-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Export CSV
          </button>
          <button
            type="button"
            disabled={!isApproved}
            onClick={() => triggerDownload(`/finance/batches/${initial.batchId}/export/pdf`)}
            className="rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm hover:bg-neutral-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Export Check Register PDF
          </button>
        </div>
      </div>

      {initial.approvedBy && (
        <div className="text-xs text-neutral-500">
          {initial.approvedBy} · {initial.approvedAt}
        </div>
      )}

      {/* Lines table */}
      <div className="rounded-lg border border-neutral-200 bg-white overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50 text-left text-neutral-500">
            <tr>
              <th className="px-3 py-2 font-medium">Contract</th>
              <th className="px-3 py-2 font-medium">Landlord / Unit</th>
              <th className="px-3 py-2 font-medium">Tenant</th>
              <th className="px-3 py-2 font-medium text-right">HAP</th>
              <th className="px-3 py-2 font-medium">Status</th>
              <th className="px-3 py-2 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {initial.rows.map((row) => (
              <LineRow
                key={row.lineId}
                row={row}
                isApproved={isApproved}
                busy={busy}
                onStopPay={() => { setReason(""); setStopPayFor(row); }}
                onReverseStopPay={() => call(`/api/line/${row.lineId}/stop-pay`, { reverse: true })}
                onMarkPaid={() => call(`/api/line/${row.lineId}/mark-paid`)}
                onUndoPaid={() => call(`/api/line/${row.lineId}/mark-paid`, { undo: true })}
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* Stop-Pay modal */}
      {stopPayFor && (
        <div className="fixed inset-0 z-30 bg-black/40 flex items-center justify-center p-4" onClick={() => setStopPayFor(null)}>
          <div className="bg-white rounded-lg w-full max-w-md p-5 space-y-3" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-base font-semibold">Stop-Pay for {stopPayFor.contractCode}</h2>
            <p className="text-sm text-neutral-600">
              This line will be excluded from the disbursement file. You can reverse it later from the same row.
            </p>
            <label className="block text-sm">
              <span className="text-neutral-700">Reason</span>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                className="mt-1 w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
                placeholder="e.g. Tenant moved out mid-month"
              />
            </label>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setStopPayFor(null)}
                className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm hover:bg-neutral-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={busy || reason.trim().length === 0}
                onClick={async () => {
                  const r = stopPayFor;
                  setStopPayFor(null);
                  await call(`/api/line/${r.lineId}/stop-pay`, { reason });
                }}
                className="rounded-md bg-ink text-white px-3 py-1.5 text-sm hover:bg-neutral-800 disabled:bg-neutral-300"
              >
                Confirm Stop-Pay
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ValidatorPanel({
  flags,
  acknowledged,
  onAcknowledge,
  isApproved,
}: {
  flags: Flag[];
  acknowledged: boolean;
  onAcknowledge: () => void;
  isApproved: boolean;
}) {
  if (flags.length === 0) {
    return (
      <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
        Pre-disburse Validator: <strong>0 issues</strong>. Ready for supervisor approval.
      </div>
    );
  }
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-sm">
          <span className="font-semibold text-amber-900">Pre-disburse Validator:</span>{" "}
          <span className="text-amber-800">{flags.length} issue{flags.length === 1 ? "" : "s"} must be acknowledged</span>
        </div>
        {!isApproved && (
          acknowledged ? (
            <span className="text-xs text-emerald-700 font-medium">Acknowledged ✓</span>
          ) : (
            <button
              type="button"
              onClick={onAcknowledge}
              className="rounded-md border border-amber-400 bg-white px-3 py-1.5 text-xs font-medium text-amber-900 hover:bg-amber-100"
            >
              Acknowledge & continue
            </button>
          )
        )}
      </div>
      <ul className="text-sm space-y-1.5">
        {flags.map((f, i) => (
          <li key={i} data-testid="validator-flag" className="flex items-start gap-2">
            <span className="mt-1 inline-block w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
            <span>
              <span className="font-medium">{f.kind === "expired_w9" ? "Expired W-9" : f.kind === "missing_banking" ? "Missing Banking" : f.kind === "abated_unit" ? "Abated Unit" : "Failed Inspection"}:</span>{" "}
              <span className="text-neutral-700">{f.message}</span>{" "}
              <span className="text-neutral-500">({f.contract_code})</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function LineRow({
  row,
  isApproved,
  busy,
  onStopPay,
  onReverseStopPay,
  onMarkPaid,
  onUndoPaid,
}: {
  row: Row;
  isApproved: boolean;
  busy: boolean;
  onStopPay: () => void;
  onReverseStopPay: () => void;
  onMarkPaid: () => void;
  onUndoPaid: () => void;
}) {
  const thirty = Math.round(row.tenant.adj * 0.3);
  const ten = Math.round((row.tenant.gross / 12) * 0.1);
  const limit = Math.min(row.grossRent, row.paymentStandard);

  return (
    <tr data-testid="batch-line" className="group border-t border-neutral-100 align-top">
      <td className="px-3 py-2.5 whitespace-nowrap">
        <Link href={`/landlords/${row.landlord.id}`} className="hover:underline" data-testid="contract-code">
          {row.contractCode}
        </Link>
      </td>
      <td className="px-3 py-2.5">
        <div className="font-medium">{row.landlord.name}</div>
        <div className="text-xs text-neutral-500">{row.unit.address}</div>
      </td>
      <td className="px-3 py-2.5">
        <Link href={`/tenants/${row.tenant.id}`} className="hover:underline">
          {row.tenant.name}
        </Link>
        <div className="text-xs text-neutral-500">{row.tenant.code}</div>
      </td>
      <td className="px-3 py-2.5 text-right tabular-nums relative">
        <span className="font-medium">{money(row.amount)}</span>
        <div
          data-testid="ttp-math"
          className="hidden group-hover:block absolute right-3 top-full mt-1 z-20 bg-ink text-white text-xs px-3 py-2 rounded shadow-lg whitespace-nowrap text-left leading-snug"
        >
          <div>TTP = max(30%×${row.tenant.adj.toLocaleString()}=${thirty}, 10%×${row.tenant.gross.toLocaleString()}/12=${ten}, $0) = <strong>${row.ttp}</strong></div>
          <div>HAP = min(${row.grossRent.toLocaleString()},${row.paymentStandard.toLocaleString()})=${limit} + ${row.utilityAllowance} − ${row.ttp} = <strong>${row.amount}</strong></div>
        </div>
      </td>
      <td className="px-3 py-2.5">
        <StatusBadge status={row.status} />
        {row.settlementDate && (
          <div data-testid="settlement-date" className="text-xs text-neutral-500 mt-1">
            Settled {row.settlementDate}
          </div>
        )}
        {row.bankRef && (
          <div data-testid="bank-ref" className="text-xs text-neutral-500">
            {row.bankRef}
          </div>
        )}
        {row.stopPayReason && (
          <div className="text-xs text-neutral-500 mt-1 max-w-[200px]">
            {row.stopPayReason}
          </div>
        )}
      </td>
      <td className="px-3 py-2.5 text-right whitespace-nowrap">
        <RowActions
          row={row}
          isApproved={isApproved}
          busy={busy}
          onStopPay={onStopPay}
          onReverseStopPay={onReverseStopPay}
          onMarkPaid={onMarkPaid}
          onUndoPaid={onUndoPaid}
        />
      </td>
    </tr>
  );
}

function RowActions({
  row,
  isApproved,
  busy,
  onStopPay,
  onReverseStopPay,
  onMarkPaid,
  onUndoPaid,
}: {
  row: Row;
  isApproved: boolean;
  busy: boolean;
  onStopPay: () => void;
  onReverseStopPay: () => void;
  onMarkPaid: () => void;
  onUndoPaid: () => void;
}) {
  if (row.status === "stopped") {
    return (
      <button
        type="button"
        disabled={busy}
        onClick={onReverseStopPay}
        className="text-xs rounded-md border border-neutral-300 bg-white px-2.5 py-1 hover:bg-neutral-50"
      >
        Reverse Stop-Pay
      </button>
    );
  }
  if (row.status === "paid") {
    return (
      <button
        type="button"
        disabled={busy}
        onClick={onUndoPaid}
        className="text-xs rounded-md border border-neutral-300 bg-white px-2.5 py-1 hover:bg-neutral-50"
      >
        Undo
      </button>
    );
  }
  return (
    <div className="flex justify-end gap-1.5">
      {isApproved && (
        <button
          type="button"
          disabled={busy}
          onClick={onMarkPaid}
          className="text-xs rounded-md bg-accent text-white px-2.5 py-1 hover:bg-emerald-800"
        >
          Mark Paid
        </button>
      )}
      <button
        type="button"
        disabled={busy}
        onClick={onStopPay}
        className="text-xs rounded-md border border-neutral-300 bg-white px-2.5 py-1 hover:bg-neutral-50"
      >
        Stop-Pay
      </button>
    </div>
  );
}

function StatusBadge({ status }: { status: Row["status"] }) {
  const map: Record<Row["status"], string> = {
    pending:  "bg-neutral-100 text-neutral-700 ring-neutral-200",
    approved: "bg-sky-50 text-sky-700 ring-sky-200",
    paid:     "bg-emerald-50 text-emerald-700 ring-emerald-200",
    stopped:  "bg-red-50 text-red-700 ring-red-200",
  };
  return (
    <span data-testid="status-badge" className={`inline-flex items-center text-xs px-2 py-0.5 rounded-full ring-1 ${map[status]}`}>
      {status}
    </span>
  );
}
