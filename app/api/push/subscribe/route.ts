import { prisma } from "@/lib/db";
import { badRequest, json, requireUser } from "@/lib/http";
import { firstError, readJson, subscribeSchema, unsubscribeSchema } from "@/lib/validation";

export async function POST(req: Request) {
  const { user, response } = await requireUser();
  if (response) return response;
  const parsed = subscribeSchema.safeParse(await readJson(req));
  if (!parsed.success) return badRequest(firstError(parsed.error));
  const { endpoint, keys } = parsed.data;

  // Un même appareil peut changer de compte : l'endpoint est unique, on le rattache à la connectée.
  await prisma.pushSubscription.upsert({
    where: { endpoint },
    create: {
      userId: user.id,
      endpoint,
      p256dh: keys.p256dh,
      auth: keys.auth,
      userAgent: req.headers.get("user-agent")?.slice(0, 300),
    },
    update: { userId: user.id, p256dh: keys.p256dh, auth: keys.auth },
  });
  return json({ ok: true }, 201);
}

export async function DELETE(req: Request) {
  const { user, response } = await requireUser();
  if (response) return response;
  const parsed = unsubscribeSchema.safeParse(await readJson(req));
  if (!parsed.success) return badRequest(firstError(parsed.error));
  await prisma.pushSubscription.deleteMany({
    where: { endpoint: parsed.data.endpoint, userId: user.id },
  });
  return json({ ok: true });
}
