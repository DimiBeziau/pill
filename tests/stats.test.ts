import { describe, expect, it } from "vitest";
import { dayState, summarize, type DayRecord } from "@/lib/stats";

const rec = (date: string, delayMin: number | null): DayRecord => {
  const scheduledAt = new Date(`${date}T20:00:00Z`);
  return {
    date,
    status: delayMin === null ? "PENDING" : "TAKEN",
    scheduledAt,
    takenAt: delayMin === null ? null : new Date(scheduledAt.getTime() + delayMin * 60_000),
  };
};

describe("dayState", () => {
  it("distingue pris, en retard, oublié, en attente et hors suivi", () => {
    expect(dayState("2026-11-18", rec("2026-11-18", 10), "2026-11-19", "2026-11-01")).toBe("taken");
    expect(dayState("2026-11-18", rec("2026-11-18", 240), "2026-11-19", "2026-11-01")).toBe("late");
    expect(dayState("2026-11-17", undefined, "2026-11-19", "2026-11-01")).toBe("missed");
    expect(dayState("2026-11-19", undefined, "2026-11-19", "2026-11-01")).toBe("pending");
    expect(dayState("2026-11-20", undefined, "2026-11-19", "2026-11-01")).toBe("none");
    expect(dayState("2026-10-30", undefined, "2026-11-19", "2026-11-01")).toBe("none");
  });
});

describe("summarize", () => {
  it("la série ne casse pas tant que la journée n'est pas finie", () => {
    const s = summarize([rec("2026-11-18", 0), rec("2026-11-17", 0)], "2026-11-19", "2026-11-10");
    expect(s.streak).toBe(2);
  });

  it("une journée oubliée casse la série", () => {
    const s = summarize([rec("2026-11-19", 0), rec("2026-11-17", 0)], "2026-11-19", "2026-11-10");
    expect(s.streak).toBe(1);
  });

  it("calcule régularité et retard moyen sans compter la journée en cours", () => {
    const s = summarize([rec("2026-11-18", 30), rec("2026-11-17", 90)], "2026-11-19", "2026-11-17");
    expect(s).toMatchObject({ taken: 2, tracked: 2, rate: 100, avgDelay: 60 });
  });

  it("sans historique, pas de taux", () => {
    expect(summarize([], "2026-11-19", "2026-11-19").rate).toBeNull();
  });
});

describe("jours de pause", () => {
  const paused = (d: string) => d >= "2026-11-12" && d < "2026-11-19";

  it("un jour de pause sans prise n'est ni oublié ni en attente", () => {
    expect(dayState("2026-11-15", undefined, "2026-11-25", "2026-11-01", paused)).toBe("paused");
    expect(dayState("2026-11-15", rec("2026-11-15", 0), "2026-11-25", "2026-11-01", paused)).toBe("taken");
  });

  it("ne compte pas la pause dans le taux et ne casse pas la série", () => {
    const records = [rec("2026-11-10", 0), rec("2026-11-11", 0), rec("2026-11-19", 0), rec("2026-11-20", 0)];
    const s = summarize(records, "2026-11-20", "2026-11-10", 30, paused);
    expect(s.streak).toBe(4);
    expect(s.tracked).toBe(4);
    expect(s.rate).toBe(100);
  });
});
