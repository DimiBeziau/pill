import { prisma } from "@/lib/db";
import { addDays, addMinutes, isValidDate, localDate, scheduledInstant } from "@/lib/time";

/** Champs de User utiles au suivi (évite de dépendre du modèle complet). */
export type Tracker = {
  id: string;
  reminderTime: string;
  timezone: string;
  snoozeMinutes: number;
  repeatMinutes: number;
};

/** On accepte de régulariser un oubli sur les 60 derniers jours au plus. */
export const BACKFILL_DAYS = 60;

export function todayFor(user: Pick<Tracker, "timezone">, now = new Date()): string {
  return localDate(now, user.timezone);
}

export async function ensureIntake(user: Tracker, date: string) {
  const scheduledAt = scheduledInstant(date, user.reminderTime, user.timezone);
  return prisma.intake.upsert({
    where: { userId_date: { userId: user.id, date } },
    create: { userId: user.id, date, scheduledAt, nextReminderAt: scheduledAt },
    update: {},
  });
}

export type TakeResult = { ok: true } | { ok: false; error: string };

/** Marque la pilule du jour `date` comme prise (aujourd'hui = maintenant, passé = heure prévue). */
export async function markTaken(
  user: Tracker,
  date: string | undefined,
  now = new Date(),
): Promise<TakeResult> {
  const today = todayFor(user, now);
  const day = date ?? today;
  if (!isValidDate(day)) return { ok: false, error: "Date invalide" };
  if (day > today) return { ok: false, error: "Impossible de valider un jour futur" };
  if (day < addDays(today, -BACKFILL_DAYS)) return { ok: false, error: "Date trop ancienne" };

  const intake = await ensureIntake(user, day);
  await prisma.intake.update({
    where: { id: intake.id },
    data: {
      status: "TAKEN",
      takenAt: day === today ? now : intake.scheduledAt,
      nextReminderAt: null,
    },
  });
  return { ok: true };
}

/** Reporte le rappel du jour de `snoozeMinutes`. Sans effet si déjà prise. */
export async function snooze(user: Tracker, now = new Date()): Promise<Date | null> {
  const intake = await ensureIntake(user, todayFor(user, now));
  if (intake.status === "TAKEN") return null;
  const next = addMinutes(now, user.snoozeMinutes);
  await prisma.intake.update({
    where: { id: intake.id },
    data: { nextReminderAt: next, snoozeCount: { increment: 1 } },
  });
  return next;
}

/** Annule une prise (erreur de saisie). Un jour passé redevient « oublié » (ligne supprimée). */
export async function undoTaken(
  user: Tracker,
  date: string | undefined,
  now = new Date(),
): Promise<TakeResult> {
  const today = todayFor(user, now);
  const day = date ?? today;
  if (!isValidDate(day)) return { ok: false, error: "Date invalide" };

  const intake = await prisma.intake.findUnique({
    where: { userId_date: { userId: user.id, date: day } },
  });
  if (!intake) return { ok: true };

  if (day === today) {
    const next = intake.scheduledAt > now ? intake.scheduledAt : addMinutes(now, user.snoozeMinutes);
    await prisma.intake.update({
      where: { id: intake.id },
      data: { status: "PENDING", takenAt: null, nextReminderAt: next },
    });
  } else {
    await prisma.intake.delete({ where: { id: intake.id } });
  }
  return { ok: true };
}

/** À appeler après un changement d'heure de rappel : réaligne le rappel du jour s'il est encore en attente. */
export async function rescheduleToday(user: Tracker, now = new Date()): Promise<void> {
  const date = todayFor(user, now);
  const intake = await prisma.intake.findUnique({
    where: { userId_date: { userId: user.id, date } },
  });
  if (!intake || intake.status !== "PENDING") return;

  const scheduledAt = scheduledInstant(date, user.reminderTime, user.timezone);
  const untouched = intake.reminderCount === 0 && intake.snoozeCount === 0;
  await prisma.intake.update({
    where: { id: intake.id },
    data: { scheduledAt, ...(untouched ? { nextReminderAt: scheduledAt } : {}) },
  });
}
