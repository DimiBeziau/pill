import { PushSetup } from "@/components/PushSetup";
import { TodayCard } from "@/components/TodayCard";
import { prisma } from "@/lib/db";
import { todayFor } from "@/lib/intake";
import { formatDuration, formatLongDate, formatTime, scheduledInstant } from "@/lib/time";
import { getCurrentUser } from "@/lib/session";
import { summarize } from "@/lib/stats";
import { addDays, localDate } from "@/lib/time";

export default async function TodayPage() {
  const user = (await getCurrentUser())!;
  const now = new Date();
  const today = todayFor(user, now);
  const firstDay = localDate(user.createdAt, user.timezone);

  const recent = await prisma.intake.findMany({
    where: { userId: user.id, date: { gte: addDays(today, -60) } },
  });
  const intake = recent.find((i) => i.date === today);
  const summary = summarize(recent, today, firstDay);
  const scheduledAt = intake?.scheduledAt ?? scheduledInstant(today, user.reminderTime, user.timezone);
  const taken = intake?.status === "TAKEN";

  return (
    <div className="flex flex-col gap-4">
      <header>
        <p className="text-sm capitalize text-muted">{formatLongDate(today)}</p>
        <h1 className="text-2xl font-bold">Bonjour {user.name} 👋</h1>
      </header>

      <TodayCard
        date={today}
        taken={taken}
        scheduledLabel={formatTime(scheduledAt, user.timezone)}
        takenLabel={intake?.takenAt ? formatTime(intake.takenAt, user.timezone) : null}
        nextReminderLabel={
          intake?.nextReminderAt && intake.nextReminderAt > now
            ? formatTime(intake.nextReminderAt, user.timezone)
            : null
        }
        snoozeLabel={`dans ${formatDuration(user.snoozeMinutes)}`}
      />

      <PushSetup vapidPublicKey={process.env.VAPID_PUBLIC_KEY ?? ""} compact />

      <section className="grid grid-cols-3 gap-3 text-center">
        <Stat value={String(summary.streak)} label="jours d'affilée" />
        <Stat value={summary.rate === null ? "–" : `${summary.rate} %`} label="sur 30 jours" />
        <Stat value={summary.avgDelay === null ? "–" : formatDuration(summary.avgDelay)} label="retard moyen" />
      </section>
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="card p-3">
      <div className="text-xl font-bold">{value}</div>
      <div className="text-xs text-muted">{label}</div>
    </div>
  );
}
