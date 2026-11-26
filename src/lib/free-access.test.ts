import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * PERMANENT FREE ACCESS POLICY guard (master prompt §0.1, §3.5): fails if anyone adds a
 * paywall-style component. If a feature genuinely needs one of these names, stop and ask
 * the founder first.
 */
const FORBIDDEN = ["Paywall", "Upgrade", "Premium", "Pro"];

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? files(p) : /\.(tsx?|jsx?)$/.test(name) ? [p] : [];
  });
}

const SRC = join(process.cwd(), "src");
const all = files(SRC).filter((f) => !f.endsWith("free-access.test.ts"));

describe("free access policy", () => {
  it("has no component files named Paywall/Upgrade/Premium/Pro", () => {
    const bad = all.filter((f) =>
      new RegExp(`(^|[/\\\\])(${FORBIDDEN.join("|")})([.-]|$)`, "i").test(
        f.slice(SRC.length).replace(/\.(tsx?|jsx?)$/, ""),
      ),
    );
    expect(bad).toEqual([]);
  });

  it("declares or renders no Paywall/Upgrade/Premium/Pro components", () => {
    const names = FORBIDDEN.join("|");
    const decl = new RegExp(
      `\\b(?:function|const|let|class)\\s+(?:${names})(?:Gate|Banner|Modal|Prompt|Button|Badge|Card|Wall|Tier)?\\b`,
    );
    const jsx = new RegExp(
      `<(?:${names})(?:Gate|Banner|Modal|Prompt|Button|Badge|Card|Wall|Tier)?[\\s/>]`,
    );
    const bad = all.filter((f) => {
      const text = readFileSync(f, "utf8");
      return decl.test(text) || jsx.test(text);
    });
    expect(bad).toEqual([]);
  });
});
