/**
 * Money helpers. Amounts are stored as integer cents (`expenses.amount_cents`)
 * so nothing downstream has to reason about float drift; this module is the one
 * place a human-entered decimal string crosses into that representation.
 */

/** Amounts above this are almost certainly a typo (a missing decimal point). */
const MAX_AMOUNT_CENTS = 1_000_000_00;

export class InvalidAmountError extends Error {
  constructor(raw: string) {
    super(`"${raw}" is not a valid expense amount`);
    this.name = "InvalidAmountError";
  }
}

/** Whole number, or up to two decimal places, e.g. "42", "42.5", "19.99". */
const AMOUNT_PATTERN = /^\d+(\.\d{1,2})?$/;

/**
 * Parse a user-entered amount ("42", "42.5", "19.99") into integer cents.
 * Throws InvalidAmountError for anything non-numeric, zero, or negative.
 */
export function parseAmountToCents(raw: string): number {
  const trimmed = raw.trim();
  if (!AMOUNT_PATTERN.test(trimmed)) {
    throw new InvalidAmountError(raw);
  }
  const amount = parseFloat(trimmed);
  if (amount <= 0) {
    throw new InvalidAmountError(raw);
  }
  // Round rather than truncate: floats can't represent decimals like 19.99
  // exactly, so `19.99 * 100` lands on 1998.9999999999998.
  const cents = Math.round(amount * 100);
  if (cents > MAX_AMOUNT_CENTS) {
    throw new InvalidAmountError(raw);
  }
  return cents;
}

/** Render integer cents back as a plain decimal string for the UI. */
export function formatCents(cents: number): string {
  return (cents / 100).toFixed(2);
}
