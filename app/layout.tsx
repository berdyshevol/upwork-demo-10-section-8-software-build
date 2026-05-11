import "./globals.css";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "OpenKey HAP Batch — Demo",
  description: "Section 8 HAP monthly batch with TTP rent calc, validator, approval, and NACHA/CSV/Check Register exports.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">
        <header className="border-b border-neutral-200 bg-white no-print">
          <div className="mx-auto max-w-6xl px-6 py-3 flex items-center justify-between">
            <Link href="/" className="font-semibold tracking-tight text-ink flex items-center gap-2">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-accent" />
              OpenKey <span className="text-neutral-400">/ HAP Batch</span>
            </Link>
            <nav className="text-sm text-neutral-600 flex gap-5">
              <Link href="/finance/batches" className="hover:text-ink">Batches</Link>
              <span className="text-neutral-400">PHA: Long Beach HA</span>
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
        <footer className="mx-auto max-w-6xl px-6 py-10 text-xs text-neutral-400 no-print">
          Demo data. Not for production use. HUD-50058 not generated.
        </footer>
      </body>
    </html>
  );
}
