// Minimal NACHA PPD ACH file builder. 94-char records, blocking factor 10.

import type { HapBatch, HapBatchLine, Landlord, HapContract, Tenant } from "./db";

export type NachaRow = {
  line: HapBatchLine;
  contract: HapContract;
  tenant: Tenant;
  landlord: Landlord;
};

const ODFI_ROUTING = "121000358"; // 9 digits — Bank of America (sample)
const COMPANY_NAME = "LONG BEACH HA";
const COMPANY_ID = "1330000088"; // 10-digit IRS-style company ID
const ENTRY_DESC = "HAP PAY";

function pad(s: string, len: number, side: "L" | "R" = "R", ch = " "): string {
  s = String(s).slice(0, len);
  return side === "R" ? s.padEnd(len, ch) : s.padStart(len, ch);
}
function padNum(n: number | string, len: number): string {
  return String(n).slice(-len).padStart(len, "0");
}
function alphanum(s: string): string {
  return s.toUpperCase().replace(/[^A-Z0-9 ]/g, " ");
}
function yymmdd(iso: string): string {
  const d = new Date(iso);
  const y = String(d.getUTCFullYear() % 100).padStart(2, "0");
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${y}${m}${dd}`;
}

export function buildNacha(batch: HapBatch, rows: NachaRow[]): string {
  // Only pay lines that are approved or paid and not stopped.
  const payable = rows.filter((r) => r.line.status === "approved" || r.line.status === "paid");

  const creationDate = yymmdd("2026-11-01");
  const creationTime = "1532";
  const effectiveDate = yymmdd("2026-11-03");
  const batchNumber = padNum(batch.id, 7);
  const odfi8 = ODFI_ROUTING.slice(0, 8);

  const fileHeader = [
    "1",
    "01",
    " " + ODFI_ROUTING,                  // Immediate Destination 10
    pad(COMPANY_ID, 10, "R"),            // Immediate Origin 10
    creationDate,
    creationTime,
    "A",
    "094",
    "10",
    "1",
    pad("LONG BEACH HOUSING AUTH", 23, "R"),
    pad(COMPANY_NAME, 23, "R"),
    pad("HAPBATCH", 8, "R"),
  ].join("");

  const batchHeader = [
    "5",
    "220",                               // credits only
    pad(COMPANY_NAME, 16, "R"),
    pad("HAP MONTHLY", 20, "R"),         // discretionary
    pad(COMPANY_ID, 10, "R"),
    "PPD",
    pad(ENTRY_DESC, 10, "R"),
    yymmdd("2026-11-01"),                // descriptive date
    effectiveDate,
    "   ",                               // settlement date (blank)
    "1",
    odfi8,
    batchNumber,
  ].join("");

  let entryCount = 0;
  let entryHashTotal = 0;
  let creditTotal = 0;

  const entries: string[] = payable.map((r, idx) => {
    const routing = (r.landlord.ach_routing || "000000000").padStart(9, "0").slice(0, 9);
    const r8 = routing.slice(0, 8);
    const checkDigit = routing.slice(8, 9);
    const amountCents = Math.round(r.line.amount * 100);
    creditTotal += amountCents;
    entryHashTotal += parseInt(r8, 10);
    entryCount++;
    const trace = `${odfi8}${padNum(idx + 1, 7)}`;

    return [
      "6",
      "22",                                                  // credit checking
      r8,
      checkDigit,
      pad(r.landlord.ach_account || "", 17, "R"),
      padNum(amountCents, 10),
      pad(r.landlord.code, 15, "R"),
      pad(alphanum(r.landlord.name), 22, "R"),
      "  ",                                                  // discretionary
      "0",                                                   // no addenda
      trace,
    ].join("");
  });

  const entryHash10 = padNum(String(entryHashTotal).slice(-10), 10);

  const batchControl = [
    "8",
    "220",
    padNum(entryCount, 6),
    entryHash10,
    padNum(0, 12),                       // total debits
    padNum(creditTotal, 12),
    pad(COMPANY_ID, 10, "R"),
    pad("", 19, "R"),                    // MAC
    pad("", 6, "R"),                     // reserved
    odfi8,
    batchNumber,
  ].join("");

  // 4 control records + N entries; block to a multiple of 10.
  const recordsSoFar = 4 + entries.length;
  const blockTotal = Math.ceil(recordsSoFar / 10) * 10;
  const blockCount = blockTotal / 10;

  const fileControl = [
    "9",
    padNum(1, 6),                        // batch count
    padNum(blockCount, 6),
    padNum(entryCount, 8),
    entryHash10,
    padNum(0, 12),
    padNum(creditTotal, 12),
    pad("", 39, "R"),
  ].join("");

  const all = [fileHeader, batchHeader, ...entries, batchControl, fileControl];
  while (all.length < blockTotal) all.push("9".repeat(94));

  // Safety: every record must be exactly 94 chars.
  for (let i = 0; i < all.length; i++) {
    if (all[i].length !== 94) {
      // pad/truncate so the file is always well-formed
      all[i] = all[i].length > 94 ? all[i].slice(0, 94) : all[i].padEnd(94, " ");
    }
  }

  return all.join("\n") + "\n";
}
