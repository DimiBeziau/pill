"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/client";

type Props = {
  date: string;
  taken: boolean;
  /** Textes déjà formatés côté serveur dans le fuseau de l'utilisatrice. */
  scheduledLabel: string;
  takenLabel: string | null;
  nextReminderLabel: string | null;
  snoozeLabel: string;
};

export function TodayCard({ date, taken, scheduledLabel, takenLabel, nextReminderLabel, snoozeLabel }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(path: string, body?: unknown) {
    setBusy(true);
    setError(null);
    const res = await api(path, "POST", body ?? { date });
    setBusy(false);
    if (res.ok) router.refresh();
    else setError(res.error);
  }

  if (taken) {
    return (
      <section className="card flex flex-col items-center gap-3 bg-ok-bg text-center">
        <div className="text-6xl">✅</div>
        <h2 className="text-2xl font-bold text-ok">Pilule prise</h2>
        <p className="text-muted">Enregistrée à {takenLabel}. À demain !</p>
        <button className="text-sm text-muted underline" disabled={busy} onClick={() => run("/api/intake/undo")}>
          Annuler (erreur de saisie)
        </button>
        {error && <p role="alert" className="text-sm text-bad">{error}</p>}
      </section>
    );
  }

  return (
    <section className="card flex flex-col gap-4 text-center">
      <div className="text-6xl">💊</div>
      <h2 className="text-2xl font-bold">As-tu pris ta pilule ?</h2>
      <p className="text-muted">
        Rappel prévu à {scheduledLabel}
        {nextReminderLabel && <> · prochaine notification à {nextReminderLabel}</>}
      </p>
      <button className="btn-primary min-h-16 text-lg" disabled={busy} onClick={() => run("/api/intake/take")}>
        ✅ Oui, c&apos;est fait
      </button>
      <button className="btn-ghost" disabled={busy} onClick={() => run("/api/intake/snooze", {})}>
        ⏰ Me rappeler {snoozeLabel}
      </button>
      {error && <p role="alert" className="text-sm text-bad">{error}</p>}
    </section>
  );
}
