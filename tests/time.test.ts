import { describe, expect, it } from "vitest";
import { addDays, isValidDate, localDate, scheduledInstant } from "@/lib/time";

describe("time", () => {
  it("calcule le jour local selon le fuseau", () => {
    const instant = new Date("2026-11-19T23:30:00Z");
    expect(localDate(instant, "Europe/Paris")).toBe("2026-11-20");
    expect(localDate(instant, "America/New_York")).toBe("2026-11-19");
  });

  it("convertit l'heure locale en instant UTC (hiver et été)", () => {
    expect(scheduledInstant("2026-11-19", "21:00", "Europe/Paris").toISOString()).toBe("2026-11-19T20:00:00.000Z");
    expect(scheduledInstant("2026-07-01", "21:00", "Europe/Paris").toISOString()).toBe("2026-07-01T19:00:00.000Z");
  });

  it("gère le changement d'heure", () => {
    expect(scheduledInstant("2026-03-29", "21:00", "Europe/Paris").toISOString()).toBe("2026-03-29T19:00:00.000Z");
  });

  it("décale et valide les dates", () => {
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
    expect(isValidDate("2026-02-30")).toBe(false);
    expect(isValidDate("2026-02-28")).toBe(true);
  });
});
