import { Calendar, type CalendarDay } from "@/components/Calendar";
import { prisma } from "@/lib/db";
import { todayFor } from "@/lib/intake";
import { getCurrentUser } from "@/lib/session";
import { dayState, delayMinutes, summarize } from "@/lib/stats";
import { addDays, formatDuration, formatLongDate, formatTime, localDate } from "@/lib/time";

const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return d.toISOString().slice(0, 7);
}

export default async function HistoryPage({ searchParams }: { searchParams: Promise<{ m?: string }> }) {
  const user = (await getCurrentUser())!;
  const today = todayFor(user);
  const firstDay = localDate(user.createdAt, user.timezone);
  const { m } = await searchParams;
  const thisMonth = today.slice(0, 7);
  let month = m && MONTH_RE.test(m) ? m : thisMonth;
  if (month > thisMonth) month = thisMonth;

  const [year, mon] = month.split("-").map(Number);
  const daysInMonth = new Date(Date.UTC(year, mon, 0)).getUTCDate();
  const from = `${month}-01`;
  const to = `${month}-${String(daysInMonth).padStart(2, "0")}`;

  const [records, recent] = await Promise.all([
    prisma.intake.findMany({ where: { userId: user.id, date: { gte: from, lte: to } } }),
    prisma.intake.findMany({ where: { userId: user.id, date: { gte: addDays(today, -89) } } }),
  ]);
  const byDate = new Map(records.map((r) => [r.date, r]));

  const lead = (new Date(`${from}T00:00:00Z`).getUTCDay() + 6) % 7; // lundi = 0
  const cells: (CalendarDay | null)[] = Array.from({ length: lead }, () => null);
  for (let d = 1; d <= daysInMonth; d++) {
    const date = `${month}-${String(d).padStart(2, "0")}`;
    const rec = byDate.get(date);
    const state = dayState(date, rec, today, firstDay);
    let detail = formatLongDate(date);
    if (state === "taken" || state === "late") {
      const delay = delayMinutes(rec!) ?? 0;
      detail += ` — prise à ${formatTime(rec!.takenAt!, user.timezone)}`;
      detail += delay > 0 ? ` (+${formatDuration(delay)})` : "";
    } else if (state === "missed") detail += " — oubliée";
    else if (state === "pending") detail += " — pas encore prise";
    else detail += " — hors suivi";
    cells.push({ date, day: d, state, detail });
  }

  const s = summarize(recent, today, firstDay, 90);
  const title = new Intl.DateTimeFormat("fr-FR", { timeZone: "UTC", month: "long", year: "numeric" }).format(
    new Date(`${from}T00:00:00Z`),
  );

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">Historique</h1>
      <Calendar
        title={title}
        prev={shiftMonth(month, -1)}
        next={month < thisMonth ? shiftMonth(month, 1) : null}
        cells={cells}
        today={today}
      />
      <section className="card grid grid-cols-2 gap-3 text-center">
        <div>
          <div className="text-xl font-bold">{s.taken} / {s.tracked}</div>
          <div className="text-xs text-muted">prises sur 90 jours</div>
        </div>
        <div>
          <div className="text-xl font-bold">{s.rate === null ? "–" : `${s.rate} %`}</div>
          <div className="text-xs text-muted">de régularité</div>
        </div>
      </section>
    </div>
  );
}
