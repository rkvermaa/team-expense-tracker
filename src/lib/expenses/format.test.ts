import { describe, expect, it } from "vitest";

import { formatUsd } from "./format.js";

describe("formatUsd (AC1)", () => {
  it("renders whole and fractional cents with two decimals", () => {
    expect(formatUsd(4250)).toBe("$42.50");
    expect(formatUsd(29900)).toBe("$299.00");
  });

  it("renders zero", () => {
    expect(formatUsd(0)).toBe("$0.00");
  });

  it("groups thousands", () => {
    expect(formatUsd(123456)).toBe("$1,234.56");
  });
});
