import { addDays } from "@/lib/time";

export type DayRecord = {
  date: string;
  status: "PENDING" | "TAKEN";
  scheduledAt: Date;
  takenAt: Date | null;
};

/** Au-delà de ce retard (minutes) une prise est signalée « en retard » (fenêtre usuelle des pilules : 3 h). */
export const LATE_AFTER_MINUTES = 180;

export type DayState = "taken" | "late" | "missed" | "pending" | "none";

export function delayMinutes(r: DayRecord): number | null {
  if (r.status !== "TAKEN" || !r.takenAt) return null;
  return Math.max(0, Math.round((r.takenAt.getTime() - r.scheduledAt.getTime()) / 60_000));
}

/**
 * État d'un jour : `none` = hors suivi (futur ou avant l'inscription).
 * Un jour passé sans prise est « oublié », aujourd'hui sans prise est « en attente ».
 */
export function dayState(
  date: string,
  record: DayRecord | undefined,
  today: string,
  firstDay: string,
): DayState {
  if (date > today || date < firstDay) return "none";
  if (record?.status === "TAKEN") {
    const delay = delayMinutes(record) ?? 0;
    return delay > LATE_AFTER_MINUTES ? "late" : "taken";
  }
  return date === today ? "pending" : "missed";
}

export type Summary = {
  streak: number;
  taken: number;
  tracked: number;
  rate: number | null;
  avgDelay: number | null;
};

/** Résumé sur les `windowDays` derniers jours (aujourd'hui inclus s'il est pris). */
export function summarize(
  records: DayRecord[],
  today: string,
  firstDay: string,
  windowDays = 30,
): Summary {
  const byDate = new Map(records.map((r) => [r.date, r]));
  const taken = (d: string) => byDate.get(d)?.status === "TAKEN";

  // Série en cours : aujourd'hui compte s'il est pris, sinon on part d'hier (la journée n'est pas finie).
  let cursor = taken(today) ? today : addDays(today, -1);
  let streak = 0;
  while (cursor >= firstDay && taken(cursor)) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }

  const windowStart = addDays(today, -(windowDays - 1));
  const from = windowStart > firstDay ? windowStart : firstDay;
  // Aujourd'hui n'est « à suivre » que s'il est pris : sinon la journée n'est pas terminée.
  const to = taken(today) ? today : addDays(today, -1);

  let tracked = 0;
  let takenCount = 0;
  const delays: number[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) {
    tracked += 1;
    const rec = byDate.get(d);
    if (rec?.status === "TAKEN") {
      takenCount += 1;
      const delay = delayMinutes(rec);
      if (delay !== null) delays.push(delay);
    }
  }

  return {
    streak,
    taken: takenCount,
    tracked,
    rate: tracked > 0 ? Math.round((takenCount / tracked) * 100) : null,
    avgDelay: delays.length ? Math.round(delays.reduce((a, b) => a + b, 0) / delays.length) : null,
  };
}
