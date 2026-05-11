# OpenKey HAP Batch — Demo Slice

A finance-grade Section 8 / HCV monthly HAP batch slice for a public housing authority.

## What this demonstrates

- **TTP rent calc with an audit trail per line** — TTP = max(30% adj. monthly income, 10% gross, welfare rent); HAP = min(gross rent, payment standard) + utility allowance − TTP. Every line shows its math on hover.
- **Pre-disburse Validator** — flags expired W-9, missing landlord banking, abated units; blocks supervisor approval until acknowledged.
- **Supervisor approval + one-click exports** — generates a valid NACHA `.ach` file, a reconcilable CSV, and a printable Check Register PDF.
- **Mark-as-Paid** — sets settlement date + bank reference, with a 60s undo window.
- **Stop-Pay** — excludes a line from the export with a reason captured; reversible from the same row.

## Run locally

```
pnpm install
pnpm exec playwright install --with-deps chromium   # tests only, one-time
pnpm dev                                            # http://localhost:3000
```

## Test

```
pnpm test
```

Playwright behavioral tests cover each acceptance criterion (`tests/acceptance.spec.ts`).

## Deploy

This is a stock Next.js 15 App Router project. Push to GitHub and import on Vercel — no env vars required. Data is in-memory and reseeds on cold start via `/api/seed`.

Deployed URL: _(set after first deploy)_
