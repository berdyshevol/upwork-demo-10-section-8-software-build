// HUD-style HAP rent calc. Values rounded to whole dollars for display.

export function calcTtp(adjMonthlyIncome: number, annualGrossIncome: number, welfareRent: number): number {
  const thirtyAdj = adjMonthlyIncome * 0.3;
  const tenGross = (annualGrossIncome / 12) * 0.1;
  return Math.round(Math.max(thirtyAdj, tenGross, welfareRent));
}

export function calcHap(grossRent: number, paymentStandard: number, utilityAllowance: number, ttp: number): number {
  const grossRentLimit = Math.min(grossRent, paymentStandard);
  return Math.max(0, Math.round(grossRentLimit + utilityAllowance - ttp));
}

export function ttpFormula(adjMonthlyIncome: number, annualGrossIncome: number, welfareRent: number) {
  const thirty = Math.round(adjMonthlyIncome * 0.3);
  const ten = Math.round((annualGrossIncome / 12) * 0.1);
  return { thirty, ten, welfareRent, ttp: Math.max(thirty, ten, welfareRent) };
}

export function hapFormula(grossRent: number, paymentStandard: number, utilityAllowance: number, ttp: number) {
  const limit = Math.min(grossRent, paymentStandard);
  return { grossRent, paymentStandard, utilityAllowance, ttp, limit, hap: Math.max(0, limit + utilityAllowance - ttp) };
}
