import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const srcDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../src");

function listFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory()
      ? listFiles(path.join(dir, entry.name))
      : [path.join(dir, entry.name)],
  );
}

describe("no plaintext credentials in production source", () => {
  it("keeps the demo password out of src/ (only its bcrypt hash is committed)", () => {
    for (const file of listFiles(srcDir)) {
      const content = readFileSync(file, "utf8");
      expect(content, `${file} must not contain the plaintext demo password`).not.toContain(
        "demo1234",
      );
    }
  });
});
