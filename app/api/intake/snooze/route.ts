import { json, requireUser } from "@/lib/http";
import { snooze } from "@/lib/intake";

export async function POST() {
  const { user, response } = await requireUser();
  if (response) return response;
  const next = await snooze(user);
  return json({ ok: true, nextReminderAt: next?.toISOString() ?? null });
}
