import { prisma } from "@/lib/db";
import { badRequest, json, requireUser } from "@/lib/http";
import { rescheduleToday } from "@/lib/intake";
import { firstError, readJson, settingsSchema } from "@/lib/validation";

export async function PATCH(req: Request) {
  const { user, response } = await requireUser();
  if (response) return response;
  const parsed = settingsSchema.safeParse(await readJson(req));
  if (!parsed.success) return badRequest(firstError(parsed.error));

  const updated = await prisma.user.update({ where: { id: user.id }, data: parsed.data });
  await rescheduleToday(updated);
  return json({ ok: true });
}
