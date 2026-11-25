"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/client";

type Props = {
  /** Date de reprise déjà formatée côté serveur ; null = rappels actifs. */
  resumeLabel: string | null;
};

export function PauseControl({ resumeLabel }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(method: "POST" | "DELETE") {
    setBusy(true);
    setError(null);
    const res = await api("/api/pause", method);
    setBusy(false);
    setConfirming(false);
    if (res.ok) router.refresh();
    else setError(res.error);
  }

  if (resumeLabel) {
    return (
      <section className="card flex flex-col gap-3 text-center">
        <p className="font-semibold">⏸️ Rappels en pause</p>
        <p className="text-sm text-muted">Reprise {resumeLabel}.</p>
        <button className="btn-ghost" disabled={busy} onClick={() => run("DELETE")}>
          Reprendre maintenant
        </button>
        {error && <p role="alert" className="text-sm text-bad">{error}</p>}
      </section>
    );
  }

  if (confirming) {
    return (
      <section className="card flex flex-col gap-3 text-center">
        <p className="text-sm text-muted">Les notifications seront coupées pendant 7 jours.</p>
        <button className="btn-primary" disabled={busy} onClick={() => run("POST")}>
          Confirmer
        </button>
        <button className="text-sm text-muted underline" disabled={busy} onClick={() => setConfirming(false)}>
          Annuler
        </button>
        {error && <p role="alert" className="text-sm text-bad">{error}</p>}
      </section>
    );
  }

  return (
    <button className="btn-ghost" onClick={() => setConfirming(true)}>
      🏁 J&apos;ai fini ma plaquette
    </button>
  );
}
