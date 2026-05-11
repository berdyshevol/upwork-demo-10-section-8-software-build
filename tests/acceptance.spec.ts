import { test, expect } from "@playwright/test";
import fs from "node:fs";

// Reseed before every test so state is deterministic.
test.beforeEach(async ({ request }) => {
  const res = await request.post("/api/seed");
  expect(res.ok()).toBeTruthy();
});

test("AC1: November batch shows 12 lines, realistic HAP total, TTP math on hover", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: /Open Demo PHA/i }).click();
  await expect(page).toHaveURL(/\/finance\/batches$/);

  await page.getByRole("link", { name: /November/i }).first().click();
  await expect(page).toHaveURL(/\/finance\/batches\/1$/);

  const lines = page.getByTestId("batch-line");
  await expect(lines).toHaveCount(12);

  const totalText = await page.getByTestId("batch-total").textContent();
  const totalNum = parseFloat((totalText ?? "").replace(/[^0-9.]/g, ""));
  expect(totalNum).toBeGreaterThan(8000);
  expect(totalNum).toBeLessThan(60000);

  const firstLine = lines.first();
  await firstLine.hover();
  await expect(firstLine.getByTestId("ttp-math")).toBeVisible();
  await expect(firstLine.getByTestId("ttp-math")).toContainText(/TTP/);
  await expect(firstLine.getByTestId("ttp-math")).toContainText(/HAP/);
});

test("AC2: Pre-disburse Validator flags exactly 2 rows and blocks Approve until acknowledged", async ({ page }) => {
  await page.goto("/finance/batches/1");

  const flags = page.getByTestId("validator-flag");
  await expect(flags).toHaveCount(2);
  await expect(flags.first()).toContainText(/W-9|Banking/i);

  const approveBtn = page.getByRole("button", { name: /^Approve Batch$/i });
  await expect(approveBtn).toBeDisabled();

  await page.getByRole("button", { name: /Acknowledge/i }).click();
  await expect(approveBtn).toBeEnabled();
});

test("AC3: Approve then export downloads NACHA .ach, CSV, and Check Register PDF", async ({ page }) => {
  await page.goto("/finance/batches/1");
  await page.getByRole("button", { name: /Acknowledge/i }).click();
  await page.getByRole("button", { name: /^Approve Batch$/i }).click();
  await expect(page.getByTestId("batch-status")).toContainText(/approved/i);

  const d1Promise = page.waitForEvent("download");
  await page.getByRole("button", { name: /Export NACHA/i }).click();
  const d1 = await d1Promise;
  expect(d1.suggestedFilename()).toMatch(/\.ach$/);
  const nachaPath = await d1.path();
  expect(nachaPath).toBeTruthy();
  const nachaContent = fs.readFileSync(nachaPath!, "utf-8");
  // NACHA files start with '1' (file header type code).
  expect(nachaContent.startsWith("1")).toBe(true);
  // NACHA records are 94 chars wide.
  const firstLine = nachaContent.split(/\r?\n/)[0];
  expect(firstLine.length).toBe(94);

  const d2Promise = page.waitForEvent("download");
  await page.getByRole("button", { name: /Export CSV/i }).click();
  const d2 = await d2Promise;
  expect(d2.suggestedFilename()).toMatch(/\.csv$/);
  const csvContent = fs.readFileSync((await d2.path())!, "utf-8");
  expect(csvContent).toMatch(/landlord/i);

  const d3Promise = page.waitForEvent("download");
  await page.getByRole("button", { name: /Export.*PDF|Check Register/i }).click();
  const d3 = await d3Promise;
  expect(d3.suggestedFilename()).toMatch(/\.pdf$/);
  const pdfContent = fs.readFileSync((await d3.path())!, "utf-8");
  expect(pdfContent.startsWith("%PDF-")).toBe(true);
});

test("AC4: Mark-as-Paid sets settlement date + bank ref, flips status to paid, Undo visible", async ({ page }) => {
  await page.goto("/finance/batches/1");
  await page.getByRole("button", { name: /Acknowledge/i }).click();
  await page.getByRole("button", { name: /^Approve Batch$/i }).click();

  const firstLine = page.getByTestId("batch-line").first();
  await firstLine.getByRole("button", { name: /Mark Paid/i }).click();

  await expect(firstLine.getByTestId("status-badge")).toContainText(/paid/i);
  await expect(firstLine.getByTestId("settlement-date")).toBeVisible();
  await expect(firstLine.getByTestId("bank-ref")).toBeVisible();
  const undoBtn = firstLine.getByRole("button", { name: /Undo/i });
  await expect(undoBtn).toBeVisible();

  // Undo flips it back.
  await undoBtn.click();
  await expect(firstLine.getByTestId("status-badge")).not.toContainText(/paid/i);
});

test("AC5: Stop-Pay excludes line from CSV export and is reversible", async ({ page }) => {
  await page.goto("/finance/batches/1");

  const firstLine = page.getByTestId("batch-line").first();
  const firstContractCode = await firstLine.getByTestId("contract-code").textContent();
  expect(firstContractCode).toBeTruthy();

  await firstLine.getByRole("button", { name: /Stop-Pay/i }).click();
  await page.getByLabel(/reason/i).fill("Tenant moved out mid-month");
  await page.getByRole("button", { name: /Confirm Stop-Pay/i }).click();
  await expect(firstLine.getByTestId("status-badge")).toContainText(/stopped/i);

  await page.getByRole("button", { name: /Acknowledge/i }).click();
  await page.getByRole("button", { name: /^Approve Batch$/i }).click();

  const dPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: /Export CSV/i }).click();
  const d = await dPromise;
  const csv = fs.readFileSync((await d.path())!, "utf-8");
  expect(csv).not.toContain(firstContractCode!.trim());

  // Reverse stop-pay.
  await firstLine.getByRole("button", { name: /Reverse Stop-Pay/i }).click();
  await expect(firstLine.getByTestId("status-badge")).not.toContainText(/stopped/i);
});
