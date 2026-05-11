// In-memory, file-process-scoped store. Reseed via /api/seed (POST).

import { calcTtp, calcHap } from "./calc";

export type Landlord = {
  id: number;
  code: string;
  name: string;
  ein: string;
  w9_on_file: boolean;
  w9_expires: string; // ISO date
  ach_routing: string;
  ach_account: string;
};

export type Tenant = {
  id: number;
  code: string;
  name: string;
  adj_monthly_income: number;
  gross_income: number; // annual gross
  household_size: number;
  welfare_rent: number;
};

export type Unit = {
  id: number;
  landlord_id: number;
  address: string;
  zip: string;
  bedrooms: number;
  payment_standard: number;
  utility_allowance: number;
  inspection_passed_at: string; // ISO date
  abated: boolean;
};

export type HapContract = {
  id: number;
  code: string;
  tenant_id: number;
  unit_id: number;
  gross_rent: number;
  ttp: number;
  hap_amount: number;
  status: "active" | "terminated";
};

export type LineStatus = "pending" | "approved" | "paid" | "stopped";

export type HapBatchLine = {
  id: number;
  batch_id: number;
  contract_id: number;
  amount: number;
  status: LineStatus;
  stop_pay_reason?: string;
  settlement_date?: string;
  bank_ref?: string;
  prev_status?: LineStatus; // for reversing stop-pay/paid
};

export type HapBatch = {
  id: number;
  period: string; // e.g. "2026-11"
  status: "draft" | "approved";
  approved_by?: string;
  approved_at?: string;
};

type Store = {
  landlords: Landlord[];
  tenants: Tenant[];
  units: Unit[];
  contracts: HapContract[];
  batches: HapBatch[];
  lines: HapBatchLine[];
};

declare global {
  // eslint-disable-next-line no-var
  var __OPENKEY_STORE: Store | undefined;
}

export function db(): Store {
  if (!globalThis.__OPENKEY_STORE) {
    globalThis.__OPENKEY_STORE = emptyStore();
    seed();
  }
  return globalThis.__OPENKEY_STORE!;
}

function emptyStore(): Store {
  return { landlords: [], tenants: [], units: [], contracts: [], batches: [], lines: [] };
}

export function seed(): void {
  const s: Store = emptyStore();
  globalThis.__OPENKEY_STORE = s;

  // 8 landlords. Last two carry the validator-flagged conditions.
  const today = new Date("2026-11-01");
  const ymd = (d: Date) => d.toISOString().slice(0, 10);
  const future = ymd(new Date("2027-06-01"));
  const expired = ymd(new Date("2026-08-15")); // before today
  const landlords: Landlord[] = [
    { id: 1, code: "LL-1001", name: "Anchor Bay Holdings",  ein: "33-1111111", w9_on_file: true,  w9_expires: future,  ach_routing: "322271627", ach_account: "555000111" },
    { id: 2, code: "LL-1002", name: "Bluff Crest Realty",   ein: "33-2222222", w9_on_file: true,  w9_expires: future,  ach_routing: "322271627", ach_account: "555000222" },
    { id: 3, code: "LL-1003", name: "Coral Pacific Mgmt",   ein: "33-3333333", w9_on_file: true,  w9_expires: future,  ach_routing: "322271627", ach_account: "555000333" },
    { id: 4, code: "LL-1004", name: "Dune Park LLC",        ein: "33-4444444", w9_on_file: true,  w9_expires: future,  ach_routing: "121000358", ach_account: "555000444" },
    { id: 5, code: "LL-1005", name: "Eastline Properties",  ein: "33-5555555", w9_on_file: true,  w9_expires: future,  ach_routing: "121000358", ach_account: "555000555" },
    { id: 6, code: "LL-1006", name: "Fairview Trust",       ein: "33-6666666", w9_on_file: true,  w9_expires: future,  ach_routing: "121000358", ach_account: "555000666" },
    // FLAG: expired W-9
    { id: 7, code: "LL-1007", name: "Grove Harbor Mgmt",    ein: "33-7777777", w9_on_file: true,  w9_expires: expired, ach_routing: "121000358", ach_account: "555000777" },
    // FLAG: missing banking
    { id: 8, code: "LL-1008", name: "Highland Reserve LLC", ein: "33-8888888", w9_on_file: true,  w9_expires: future,  ach_routing: "",          ach_account: "" },
  ];

  // 12 tenants
  const tenantSeed: Array<{ name: string; adj: number; gross: number; size: number }> = [
    { name: "Maria Alvarez",     adj: 1450, gross: 19200, size: 3 },
    { name: "Jamal Washington",  adj: 1820, gross: 23100, size: 2 },
    { name: "Linh Tran",         adj: 2100, gross: 27800, size: 4 },
    { name: "Sofia Romero",      adj: 1290, gross: 16800, size: 2 },
    { name: "Devon Carter",      adj: 1670, gross: 21500, size: 3 },
    { name: "Aisha Patel",       adj: 1955, gross: 25400, size: 3 },
    { name: "Brian O'Connell",   adj: 1110, gross: 14600, size: 1 },
    { name: "Yolanda Brooks",    adj: 1780, gross: 22600, size: 4 },
    { name: "Hector Mendoza",    adj: 1340, gross: 17500, size: 2 },
    { name: "Priya Singh",       adj: 1610, gross: 20900, size: 3 },
    { name: "Tyrone Jackson",    adj: 1900, gross: 24800, size: 3 },
    { name: "Esther Kim",        adj: 1495, gross: 19400, size: 2 },
  ];
  const tenants: Tenant[] = tenantSeed.map((t, i) => ({
    id: i + 1,
    code: `T-${String(2001 + i)}`,
    name: t.name,
    adj_monthly_income: t.adj,
    gross_income: t.gross,
    household_size: t.size,
    welfare_rent: 0,
  }));

  // 12 units — distribute across the 8 landlords. Put the flagged landlords on the last two contracts.
  const landlordRotation = [1, 2, 3, 4, 5, 6, 1, 2, 3, 4, 7, 8]; // 11th=LL-1007 (expired W-9), 12th=LL-1008 (missing ACH)
  const unitSeed: Array<{ addr: string; bd: number; ps: number; ua: number }> = [
    { addr: "412 Pine Ave, Long Beach, CA", bd: 2, ps: 1750, ua: 120 },
    { addr: "228 Magnolia St, Long Beach, CA", bd: 1, ps: 1480, ua: 95  },
    { addr: "917 Atlantic Blvd, Long Beach, CA", bd: 3, ps: 2250, ua: 165 },
    { addr: "55 Cherry Ln, Long Beach, CA", bd: 1, ps: 1480, ua: 95  },
    { addr: "1331 Anaheim St, Long Beach, CA", bd: 2, ps: 1750, ua: 120 },
    { addr: "740 Junipero Ave, Long Beach, CA", bd: 2, ps: 1750, ua: 120 },
    { addr: "88 Pacific Coast Hwy, Long Beach, CA", bd: 1, ps: 1480, ua: 95  },
    { addr: "603 Linden Ave, Long Beach, CA", bd: 3, ps: 2250, ua: 165 },
    { addr: "1408 7th St, Long Beach, CA", bd: 2, ps: 1750, ua: 120 },
    { addr: "271 Daisy Ave, Long Beach, CA", bd: 2, ps: 1750, ua: 120 },
    { addr: "954 Locust Ave, Long Beach, CA", bd: 2, ps: 1750, ua: 120 },
    { addr: "117 Termino Ave, Long Beach, CA", bd: 1, ps: 1480, ua: 95  },
  ];
  const units: Unit[] = unitSeed.map((u, i) => ({
    id: i + 1,
    landlord_id: landlordRotation[i],
    address: u.addr,
    zip: "90802",
    bedrooms: u.bd,
    payment_standard: u.ps,
    utility_allowance: u.ua,
    inspection_passed_at: ymd(new Date("2026-06-15")),
    abated: false,
  }));

  const grossRents: number[] = [1700, 1450, 2200, 1490, 1740, 1780, 1500, 2280, 1730, 1760, 1745, 1495];

  const contracts: HapContract[] = unitSeed.map((_, i) => {
    const tenant = tenants[i];
    const unit = units[i];
    const gross_rent = grossRents[i];
    const ttp = calcTtp(tenant.adj_monthly_income, tenant.gross_income, tenant.welfare_rent);
    const hap = calcHap(gross_rent, unit.payment_standard, unit.utility_allowance, ttp);
    return {
      id: i + 1,
      code: `HAP-${String(7001 + i)}`,
      tenant_id: tenant.id,
      unit_id: unit.id,
      gross_rent,
      ttp,
      hap_amount: hap,
      status: "active",
    };
  });

  const batches: HapBatch[] = [
    { id: 1, period: "2026-11", status: "draft" },
  ];

  const lines: HapBatchLine[] = contracts.map((c, i) => ({
    id: i + 1,
    batch_id: 1,
    contract_id: c.id,
    amount: c.hap_amount,
    status: "pending",
  }));

  s.landlords = landlords;
  s.tenants = tenants;
  s.units = units;
  s.contracts = contracts;
  s.batches = batches;
  s.lines = lines;
}

export type ValidatorFlag = {
  line_id: number;
  contract_code: string;
  landlord_name: string;
  kind: "expired_w9" | "missing_banking" | "failed_inspection" | "abated_unit";
  message: string;
};

export function validate(batchId: number): ValidatorFlag[] {
  const store = db();
  const flags: ValidatorFlag[] = [];
  const today = new Date("2026-11-01");
  for (const line of store.lines.filter((l) => l.batch_id === batchId && l.status !== "stopped")) {
    const contract = store.contracts.find((c) => c.id === line.contract_id)!;
    const unit = store.units.find((u) => u.id === contract.unit_id)!;
    const landlord = store.landlords.find((l) => l.id === unit.landlord_id)!;

    if (new Date(landlord.w9_expires) < today) {
      flags.push({
        line_id: line.id,
        contract_code: contract.code,
        landlord_name: landlord.name,
        kind: "expired_w9",
        message: `Expired W-9 for ${landlord.name} (expired ${landlord.w9_expires})`,
      });
    }
    if (!landlord.ach_routing || !landlord.ach_account) {
      flags.push({
        line_id: line.id,
        contract_code: contract.code,
        landlord_name: landlord.name,
        kind: "missing_banking",
        message: `Missing ACH banking for ${landlord.name}`,
      });
    }
    if (unit.abated) {
      flags.push({
        line_id: line.id,
        contract_code: contract.code,
        landlord_name: landlord.name,
        kind: "abated_unit",
        message: `Unit ${unit.address} is currently abated`,
      });
    }
    // failed-inspection rule omitted from seed; would compare inspection_passed_at < today - 30d
  }
  return flags;
}

export function getBatchView(batchId: number) {
  const s = db();
  const batch = s.batches.find((b) => b.id === batchId);
  if (!batch) return null;
  const rows = s.lines
    .filter((l) => l.batch_id === batchId)
    .map((line) => {
      const contract = s.contracts.find((c) => c.id === line.contract_id)!;
      const unit = s.units.find((u) => u.id === contract.unit_id)!;
      const landlord = s.landlords.find((l) => l.id === unit.landlord_id)!;
      const tenant = s.tenants.find((t) => t.id === contract.tenant_id)!;
      return { line, contract, unit, landlord, tenant };
    });
  const total = rows
    .filter((r) => r.line.status !== "stopped")
    .reduce((a, r) => a + r.line.amount, 0);
  return { batch, rows, total, flags: validate(batchId) };
}

export function approveBatch(batchId: number): void {
  const s = db();
  const batch = s.batches.find((b) => b.id === batchId);
  if (!batch) return;
  batch.status = "approved";
  batch.approved_by = "Supervisor: J. Ramirez";
  batch.approved_at = new Date("2026-11-01T15:32:00Z").toISOString();
  for (const line of s.lines.filter((l) => l.batch_id === batchId && l.status === "pending")) {
    line.status = "approved";
  }
}

export function stopPayLine(lineId: number, reason: string): void {
  const s = db();
  const line = s.lines.find((l) => l.id === lineId);
  if (!line) return;
  line.prev_status = line.status;
  line.status = "stopped";
  line.stop_pay_reason = reason;
}

export function reverseStopPay(lineId: number): void {
  const s = db();
  const line = s.lines.find((l) => l.id === lineId);
  if (!line || line.status !== "stopped") return;
  line.status = line.prev_status ?? "pending";
  line.stop_pay_reason = undefined;
  line.prev_status = undefined;
}

export function markPaid(lineId: number): void {
  const s = db();
  const line = s.lines.find((l) => l.id === lineId);
  if (!line) return;
  line.prev_status = line.status;
  line.status = "paid";
  line.settlement_date = "2026-11-03";
  line.bank_ref = `ACH-${String(100000 + lineId)}`;
}

export function undoPaid(lineId: number): void {
  const s = db();
  const line = s.lines.find((l) => l.id === lineId);
  if (!line || line.status !== "paid") return;
  line.status = line.prev_status ?? "approved";
  line.settlement_date = undefined;
  line.bank_ref = undefined;
  line.prev_status = undefined;
}
