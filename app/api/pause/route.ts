import { json, requireUser } from "@/lib/http";
import { endPause, startPause } from "@/lib/pause";

/** Démarre la pause de fin de plaquette (7 jours). */
export async function POST() {
  const { user, response } = await requireUser();
  if (response) return response;
  await startPause(user);
  return json({ ok: true });
}

/** Reprend les rappels immédiatement. */
export async function DELETE() {
  const { user, response } = await requireUser();
  if (response) return response;
  await endPause(user);
  return json({ ok: true });
}
