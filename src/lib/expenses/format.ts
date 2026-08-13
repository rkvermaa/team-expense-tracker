const USD = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

/**
 * Formats an integer cent amount as a USD string, e.g. 4250 -> "$42.50".
 * Amounts are stored as integer cents (see `expenses.amount_cents`), so this
 * avoids floating-point rounding by dividing only at the display boundary.
 */
export function formatUsd(cents: number): string {
  return USD.format(cents / 100);
}
