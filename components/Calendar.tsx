"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/client";

export type CalendarDay = {
  date: string;
  day: number;
  state: "taken" | "late" | "missed" | "pending" | "paused" | "none";
  detail: string;
};

type Props = {
  title: string;
  prev: string;
  next: string | null;
  /** Cases du mois, Monday-first ; `null` = case vide de début de grille. */
  cells: (CalendarDay | null)[];
  today: string;
};

const STYLE: Record<CalendarDay["state"], string> = {
  taken: "bg-ok-bg text-ok font-semibold",
  late: "bg-warn-bg text-warn font-semibold",
  missed: "bg-bad-bg text-bad font-semibold",
  pending: "border-2 border-brand text-brand font-semibold",
  paused: "bg-muted/10 text-muted",
  none: "text-muted/50",
};

export function Calendar({ title, prev, next, cells, today }: Props) {
  const router = useRouter();
  const [selected, setSelected] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const day = cells.find((c) => c?.date === selected) ?? null;

  async function run(path: string) {
    if (!day) return;
    setBusy(true);
    setError(null);
    const res = await api(path, "POST", { date: day.date });
    setBusy(false);
    if (res.ok) router.refresh();
    else setError(res.error);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <Link href={`/history?m=${prev}`} aria-label="Mois précédent" className="btn-ghost w-12 px-0">‹</Link>
        <h2 className="text-lg font-bold capitalize">{title}</h2>
        {next ? (
          <Link href={`/history?m=${next}`} aria-label="Mois suivant" className="btn-ghost w-12 px-0">›</Link>
        ) : (
          <span className="w-12" />
        )}
      </div>

      <div className="card p-3">
        <div className="mb-2 grid grid-cols-7 text-center text-xs text-muted">
          {["L", "M", "M", "J", "V", "S", "D"].map((d, i) => (
            <span key={i}>{d}</span>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1.5">
          {cells.map((c, i) =>
            c ? (
              <button
                key={c.date}
                disabled={c.state === "none" || c.state === "paused"}
                onClick={() => {
                  setSelected(c.date);
                  setError(null);
                }}
                aria-label={`${c.date} : ${c.detail}`}
                className={`aspect-square rounded-xl text-sm ${STYLE[c.state]} ${
                  selected === c.date ? "ring-2 ring-ink" : ""
                }`}
              >
                {c.day}
              </button>
            ) : (
              <span key={`e${i}`} />
            ),
          )}
        </div>
      </div>

      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
        <li>🟩 Prise</li>
        <li>🟨 En retard (&gt; 3 h)</li>
        <li>🟥 Oubliée</li>
        <li>⬜ Pause</li>
      </ul>

      {day && day.state !== "none" && day.state !== "paused" && (
        <section className="card flex flex-col gap-3">
          <p className="font-semibold">{day.detail}</p>
          {day.state === "taken" || day.state === "late" ? (
            <button className="btn-ghost" disabled={busy} onClick={() => run("/api/intake/undo")}>
              Annuler cette prise
            </button>
          ) : (
            <button className="btn-primary" disabled={busy} onClick={() => run("/api/intake/take")}>
              {day.date === today ? "Marquer comme prise" : "J'ai en fait pris ma pilule ce jour-là"}
            </button>
          )}
          {error && <p role="alert" className="text-sm text-bad">{error}</p>}
        </section>
      )}
    </div>
  );
}
