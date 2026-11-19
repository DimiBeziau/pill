import { json, requireUser } from "@/lib/http";
import { isPushConfigured, sendToUser } from "@/lib/push";
import { todayFor } from "@/lib/intake";

export async function POST() {
  const { user, response } = await requireUser();
  if (response) return response;
  if (!isPushConfigured()) return json({ error: "Notifications non configurées sur le serveur" }, 503);

  const sent = await sendToUser(user.id, {
    title: "💊 Notification de test",
    body: "Tout fonctionne : tu recevras tes rappels ici.",
    date: todayFor(user),
    snoozeMinutes: user.snoozeMinutes,
    tag: "pill-test",
    test: true,
  });
  return sent > 0 ? json({ ok: true, sent }) : json({ error: "Aucun appareil joignable" }, 502);
}
