import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="space-y-10">
      <section className="space-y-4">
        <p className="text-xs uppercase tracking-[0.18em] text-accent font-medium">Section 8 / HCV — Finance</p>
        <h1 className="text-4xl font-semibold tracking-tight">HAP Monthly Batch, finance-grade.</h1>
        <p className="text-neutral-600 max-w-2xl">
          One slice of an OpenKey-class Section 8 platform: TTP rent calc with an audit trail per line, a
          pre-disburse validator that blocks bad pays, supervisor approval, and one-click NACHA / CSV /
          Check Register exports. Built for housing authorities that still close month-end on a spreadsheet.
        </p>
        <div className="pt-2">
          <Link
            href="/finance/batches"
            className="inline-flex items-center gap-2 rounded-md bg-ink text-white px-4 py-2 text-sm font-medium hover:bg-neutral-800"
          >
            Open Demo PHA →
          </Link>
        </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card title="Rent calc with audit" body="TTP = max(30% adj. monthly income, 10% gross, welfare rent). HAP = min(gross rent, payment standard) + utility allowance − TTP. Every line shows its math on hover." />
        <Card title="Pre-disburse validator" body="Flags expired W-9, missing landlord banking, abated units, and inspections older than 30 days before a supervisor can approve." />
        <Card title="Real exports" body="A valid NACHA .ach file, a CSV that reconciles, and a printable Check Register PDF — no third-party plugin required." />
      </section>

      <section className="border-t border-neutral-200 pt-6 text-sm text-neutral-500">
        Seeded PHA: <span className="text-neutral-700">Long Beach HA</span> — 8 landlords, 12 tenants, 12 active HAP contracts, draft November batch ready for review.
      </section>
    </div>
  );
}

function Card({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-5">
      <div className="text-sm font-semibold mb-1.5">{title}</div>
      <div className="text-sm text-neutral-600 leading-relaxed">{body}</div>
    </div>
  );
}
