/**
 * Money helpers. Amounts are stored as integer cents (`expenses.amount_cents`)
 * so nothing downstream has to reason about float drift; this module is the one
 * place a human-entered decimal string crosses into that representation.
 */

/** Amounts above this are almost certainly a typo (a missing decimal point). */
const MAX_AMOUNT_CENTS = 1_000_000_00;

/** A plain decimal amount: whole rupees, or rupees with one or two decimal places. */
const AMOUNT_PATTERN = /^\d+(\.\d{1,2})?$/;

export class InvalidAmountError extends Error {
  constructor(raw: string) {
    super(`"${raw}" is not a valid expense amount`);
    this.name = "InvalidAmountError";
  }
}

/**
 * Parse a user-entered amount ("42", "42.5", "19.99") into integer cents.
 * Throws InvalidAmountError for anything non-numeric, zero, or negative.
 *
 * Splits on the decimal point and parses each half as an integer rather than
 * multiplying a float by 100, so amounts like "19.99" don't drift to 1998
 * cents via binary floating-point rounding.
 */
export function parseAmountToCents(raw: string): number {
  const trimmed = raw.trim();
  if (!AMOUNT_PATTERN.test(trimmed)) {
    throw new InvalidAmountError(raw);
  }
  const [whole, fraction = ""] = trimmed.split(".");
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  if (cents <= 0 || cents > MAX_AMOUNT_CENTS) {
    throw new InvalidAmountError(raw);
  }
  return cents;
}

/** Render integer cents back as a plain decimal string for the UI. */
export function formatCents(cents: number): string {
  return (cents / 100).toFixed(2);
}
