import { prisma } from "@/lib/db";
import { addMinutes, localDate, scheduledInstant } from "@/lib/time";
import { isPausedOn, pausesSince } from "@/lib/pause";
import { isPushConfigured, sendToUser } from "@/lib/push";

/** Nombre maximal de notifications par jour et par utilisatrice (rappel initial + relances). */
export const MAX_REMINDERS_PER_DAY = 6;
const RETRY_AFTER_FAILURE_MINUTES = 5;

/**
 * Une passe du planificateur : crée l'entrée du jour dès que l'heure de rappel est atteinte,
 * puis envoie toutes les notifications échues (rappel initial, relances, rappels reportés).
 */
export async function tick(now = new Date()): Promise<number> {
  if (!isPushConfigured()) return 0;

  const users = await prisma.user.findMany({
    where: { subscriptions: { some: {} } },
    select: {
      id: true,
      reminderTime: true,
      timezone: true,
      snoozeMinutes: true,
      repeatMinutes: true,
    },
  });

  let notified = 0;
  for (const user of users) {
    const date = localDate(now, user.timezone);
    // Pause de fin de plaquette : ni entrée du jour, ni notification.
    if (isPausedOn(await pausesSince(user.id, date), date)) continue;
    const scheduledAt = scheduledInstant(date, user.reminderTime, user.timezone);

    // Crée l'entrée du jour une fois l'heure atteinte (sans écraser un report ou une prise).
    if (scheduledAt <= now) {
      await prisma.intake.upsert({
        where: { userId_date: { userId: user.id, date } },
        create: { userId: user.id, date, scheduledAt, nextReminderAt: scheduledAt },
        update: {},
      });
    }

    const intake = await prisma.intake.findUnique({
      where: { userId_date: { userId: user.id, date } },
    });
    if (!intake || intake.status !== "PENDING") continue;
    if (!intake.nextReminderAt || intake.nextReminderAt > now) continue;

    const count = intake.reminderCount + 1;
    const first = count === 1 && intake.snoozeCount === 0;
    const sent = await sendToUser(user.id, {
      title: first ? "💊 C'est l'heure de ta pilule" : "💊 Pilule : tu l'as prise ?",
      body: first
        ? "Appuie pour confirmer la prise, ou reporte le rappel."
        : `Rappel n°${count} : pas encore de prise enregistrée aujourd'hui.`,
      date,
      snoozeMinutes: user.snoozeMinutes,
      tag: `pill-${date}`,
    });

    if (sent === 0) {
      // Aucun appareil joignable : on réessaie bientôt sans consommer le quota de relances.
      await prisma.intake.update({
        where: { id: intake.id },
        data: { nextReminderAt: addMinutes(now, RETRY_AFTER_FAILURE_MINUTES) },
      });
      continue;
    }

    const more = user.repeatMinutes > 0 && count < MAX_REMINDERS_PER_DAY;
    await prisma.intake.update({
      where: { id: intake.id },
      data: {
        reminderCount: count,
        nextReminderAt: more ? addMinutes(now, user.repeatMinutes) : null,
      },
    });
    notified += 1;
  }
  return notified;
}

const globalForScheduler = globalThis as unknown as { pillScheduler?: NodeJS.Timeout };

export function startScheduler(): void {
  if (globalForScheduler.pillScheduler) return;
  let running = false;
  globalForScheduler.pillScheduler = setInterval(async () => {
    if (running) return;
    running = true;
    try {
      await tick();
    } catch (err) {
      console.error("[scheduler]", err);
    } finally {
      running = false;
    }
  }, 60_000);
  console.log("[scheduler] démarré (passe toutes les 60 s)");
}
