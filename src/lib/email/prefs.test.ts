import { describe, expect, it } from "vitest";
import { prefsSchema } from "./prefs";

describe("email preference validation", () => {
  it("defaults safely and drops invalid regions and time zones", () => {
    const p = prefsSchema.parse({ country: "CA", region: "TX", timeZone: "Mars/Base" });
    expect(p.region).toBe("");
    expect(p.timeZone).toBe("America/Vancouver");
    expect(p.frequency).toBe("daily");
    expect(prefsSchema.parse({ country: "CA", region: "BC" }).region).toBe("BC");
  });
  it("rejects unknown equipment and compensation values", () => {
    expect(prefsSchema.safeParse({ equipment: ["drone"] }).success).toBe(false);
    expect(prefsSchema.safeParse({ compensationTypes: ["crypto"] }).success).toBe(false);
  });
});
