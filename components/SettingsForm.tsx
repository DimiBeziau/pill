"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "@/lib/client";

type Props = {
  initial: { name: string; reminderTime: string; timezone: string; snoozeMinutes: number; repeatMinutes: number };
};

const SNOOZE = [10, 15, 30, 60, 90, 120];
const REPEAT = [0, 10, 15, 30, 60];

export function SettingsForm({ initial }: Props) {
  const router = useRouter();
  const [form, setForm] = useState(initial);
  const [zones, setZones] = useState<string[]>([]);
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // Liste des fuseaux fournie par le navigateur (absente côté serveur).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setZones(Intl.supportedValuesOf("timeZone"));
  }, []);

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => setForm((f) => ({ ...f, [key]: value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setStatus(null);
    const res = await api("/api/settings", "PATCH", form);
    setBusy(false);
    setStatus(res.ok ? { ok: true, text: "Réglages enregistrés." } : { ok: false, text: res.error });
    if (res.ok) router.refresh();
  }

  const label = "flex flex-col gap-1 text-sm font-medium";

  return (
    <form onSubmit={submit} className="card flex flex-col gap-4">
      <label className={label}>
        Prénom
        <input className="field" value={form.name} onChange={(e) => set("name", e.target.value)} required maxLength={60} />
      </label>
      <label className={label}>
        Heure du rappel
        <input
          className="field"
          type="time"
          value={form.reminderTime}
          onChange={(e) => set("reminderTime", e.target.value)}
          required
        />
      </label>
      <label className={label}>
        « Me rappeler plus tard » après
        <select className="field" value={form.snoozeMinutes} onChange={(e) => set("snoozeMinutes", Number(e.target.value))}>
          {SNOOZE.map((m) => (
            <option key={m} value={m}>{m < 60 ? `${m} minutes` : `${m / 60} h`.replace("1.5 h", "1 h 30")}</option>
          ))}
        </select>
      </label>
      <label className={label}>
        Relance automatique si pas de réponse
        <select className="field" value={form.repeatMinutes} onChange={(e) => set("repeatMinutes", Number(e.target.value))}>
          {REPEAT.map((m) => (
            <option key={m} value={m}>{m === 0 ? "Jamais" : `Toutes les ${m} minutes`}</option>
          ))}
        </select>
      </label>
      <label className={label}>
        Fuseau horaire
        <input
          className="field"
          list="zones"
          value={form.timezone}
          onChange={(e) => set("timezone", e.target.value)}
          required
        />
        <datalist id="zones">{zones.map((z) => <option key={z} value={z} />)}</datalist>
      </label>
      {status && (
        <p role="status" className={`text-sm ${status.ok ? "text-ok" : "text-bad"}`}>{status.text}</p>
      )}
      <button className="btn-primary" disabled={busy}>Enregistrer</button>
    </form>
  );
}
