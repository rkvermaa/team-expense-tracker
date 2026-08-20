import { describe, expect, it } from "vitest";
import { canDelete } from "./status";

describe("canDelete", () => {
  it("AC1: allows deleting a draft expense", () => {
    expect(canDelete("draft")).toBe(true);
  });

  it("AC1: allows deleting a rejected expense", () => {
    expect(canDelete("rejected")).toBe(true);
  });

  it("AC1: disallows deleting a submitted expense", () => {
    expect(canDelete("submitted")).toBe(false);
  });

  it("AC1: disallows deleting an approved expense", () => {
    expect(canDelete("approved")).toBe(false);
  });
});
