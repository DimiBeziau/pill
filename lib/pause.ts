import { prisma } from "@/lib/db";
import { addDays, localDate } from "@/lib/time";

/** Durée de la pause de fin de plaquette (jours). */
export const PAUSE_DAYS = 7;

export type PauseRange = { startDate: string; endDate: string };

/** Vrai si le jour local `date` tombe dans une pause ([startDate, endDate[). */
export function isPausedOn(periods: PauseRange[], date: string): boolean {
  return periods.some((p) => p.startDate <= date && date < p.endDate);
}

/** Pauses d'une utilisatrice qui touchent la période commençant à `since` (jour local). */
export function pausesSince(userId: string, since: string): Promise<PauseRange[]> {
  return prisma.pausePeriod.findMany({
    where: { userId, endDate: { gt: since } },
    select: { startDate: true, endDate: true },
  });
}

/** Suspend les rappels 7 jours à partir d'aujourd'hui ; reprise le 7e jour suivant. */
export async function startPause(
  user: { id: string; timezone: string },
  now = new Date(),
): Promise<PauseRange> {
  const today = localDate(now, user.timezone);
  const current = (await pausesSince(user.id, today)).find((p) => isPausedOn([p], today));
  if (current) return current;
  return prisma.pausePeriod.create({
    data: { userId: user.id, startDate: today, endDate: addDays(today, PAUSE_DAYS) },
    select: { startDate: true, endDate: true },
  });
}

/** Reprend les rappels dès aujourd'hui : la pause en cours est raccourcie (ou supprimée si elle vient de commencer). */
export async function endPause(user: { id: string; timezone: string }, now = new Date()): Promise<void> {
  const today = localDate(now, user.timezone);
  const current = await prisma.pausePeriod.findFirst({
    where: { userId: user.id, startDate: { lte: today }, endDate: { gt: today } },
  });
  if (!current) return;
  if (current.startDate >= today) await prisma.pausePeriod.delete({ where: { id: current.id } });
  else await prisma.pausePeriod.update({ where: { id: current.id }, data: { endDate: today } });
}
