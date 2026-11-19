"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/client";

type State = "loading" | "unsupported" | "needs-install" | "denied" | "off" | "on";

function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padded = (base64 + "=".repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(padded);
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export function PushSetup({ vapidPublicKey, compact = false }: { vapidPublicKey: string; compact?: boolean }) {
  const [state, setState] = useState<State>("loading");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const detect = useCallback(async () => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true;
    const ios = /iPhone|iPad|iPod/.test(navigator.userAgent);
    if (ios && !standalone) return setState("needs-install");
    if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
      return setState("unsupported");
    }
    if (Notification.permission === "denied") return setState("denied");
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    setState(sub && Notification.permission === "granted" ? "on" : "off");
  }, []);

  useEffect(() => {
    // Détection asynchrone de l'état du navigateur (API non disponible côté serveur).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void detect();
  }, [detect]);

  async function enable() {
    setBusy(true);
    setMessage(null);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState(permission === "denied" ? "denied" : "off");
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const existing = await reg.pushManager.getSubscription();
      const sub =
        existing ??
        (await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
        }));
      const res = await api("/api/push/subscribe", "POST", sub.toJSON());
      if (!res.ok) {
        setMessage(res.error);
        return;
      }
      setState("on");
    } catch {
      setMessage("Impossible d'activer les notifications sur cet appareil.");
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) {
      await api("/api/push/subscribe", "DELETE", { endpoint: sub.endpoint });
      await sub.unsubscribe();
    }
    setState("off");
    setBusy(false);
  }

  async function test() {
    setBusy(true);
    const res = await api("/api/push/test", "POST");
    setMessage(res.ok ? "Notification envoyée." : res.error);
    setBusy(false);
  }

  if (state === "loading") return null;
  if (compact && state === "on") return null;

  return (
    <section className="card flex flex-col gap-3">
      <h2 className="font-semibold">🔔 Notifications sur cet appareil</h2>
      {state === "needs-install" && (
        <p className="text-sm text-muted">
          Sur iPhone, ajoute d&apos;abord Pill à l&apos;écran d&apos;accueil (Partager → « Sur l&apos;écran d&apos;accueil »), puis rouvre
          l&apos;app depuis l&apos;icône pour activer les notifications.
        </p>
      )}
      {state === "unsupported" && (
        <p className="text-sm text-muted">Ce navigateur ne gère pas les notifications push.</p>
      )}
      {state === "denied" && (
        <p className="text-sm text-bad">
          Les notifications sont bloquées. Autorise-les dans les réglages du navigateur ou de l&apos;appareil pour ce site.
        </p>
      )}
      {state === "off" && (
        <>
          <p className="text-sm text-muted">Active-les pour recevoir ton rappel quotidien, même app fermée.</p>
          <button className="btn-primary" disabled={busy} onClick={enable}>Activer les notifications</button>
        </>
      )}
      {state === "on" && (
        <>
          <p className="text-sm text-ok">Activées sur cet appareil.</p>
          <div className="flex gap-2">
            <button className="btn-ghost flex-1" disabled={busy} onClick={test}>Envoyer un test</button>
            <button className="btn-ghost flex-1" disabled={busy} onClick={disable}>Désactiver</button>
          </div>
        </>
      )}
      {message && <p role="status" className="text-sm text-muted">{message}</p>}
    </section>
  );
}
