import { prisma } from "@/lib/db";
import { addDays, localDate, scheduledInstant } from "@/lib/time";

/** Durée de la pause de fin de plaquette (jours). */
export const PAUSE_DAYS = 7;

type PauseUser = { id: string; reminderTime: string; timezone: string };

export function isPaused(user: { pausedUntil: Date | null }, now = new Date()): boolean {
  return !!user.pausedUntil && user.pausedUntil > now;
}

/** Suspend les rappels pendant 7 jours : reprise à l'heure de rappel, le 7e jour suivant. */
export async function startPause(user: PauseUser, now = new Date()): Promise<Date> {
  const today = localDate(now, user.timezone);
  const until = scheduledInstant(addDays(today, PAUSE_DAYS), user.reminderTime, user.timezone);
  await prisma.user.update({ where: { id: user.id }, data: { pausedUntil: until } });
  return until;
}

export async function endPause(userId: string): Promise<void> {
  await prisma.user.update({ where: { id: userId }, data: { pausedUntil: null } });
}
