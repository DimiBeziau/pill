// Service worker : affiche les rappels push et exécute les actions des notifications.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: "💊 Pilule", body: event.data ? event.data.text() : "" };
  }
  const actions = data.test
    ? []
    : [
        { action: "take", title: "✅ Prise" },
        { action: "snooze", title: `⏰ Dans ${formatMinutes(data.snoozeMinutes || 60)}` },
      ];
  event.waitUntil(
    self.registration.showNotification(data.title || "💊 Pilule", {
      body: data.body || "",
      icon: "/icons/icon-192.png",
      badge: "/icons/badge.png",
      tag: data.tag || "pill",
      renotify: true,
      requireInteraction: !data.test,
      data: { date: data.date },
      actions,
    }),
  );
});

function formatMinutes(m) {
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  return m % 60 === 0 ? `${h} h` : `${h} h ${m % 60}`;
}

async function call(path, body) {
  const res = await fetch(path, {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.ok;
}

async function openApp() {
  const clients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
  for (const c of clients) {
    if ("focus" in c) {
      await c.focus();
      if ("navigate" in c) await c.navigate("/");
      return;
    }
  }
  await self.clients.openWindow("/");
}

self.addEventListener("notificationclick", (event) => {
  const n = event.notification;
  n.close();
  const date = n.data && n.data.date;

  if (event.action === "take" || event.action === "snooze") {
    const path = event.action === "take" ? "/api/intake/take" : "/api/intake/snooze";
    event.waitUntil(
      call(path, { date }).then(async (ok) => {
        // Session expirée ou erreur réseau : on ouvre l'app pour que l'action ne soit jamais perdue.
        if (!ok) return openApp();
        const clients = await self.clients.matchAll({ type: "window" });
        clients.forEach((c) => c.postMessage({ type: "intake-changed" }));
      }),
    );
    return;
  }
  event.waitUntil(openApp());
});
