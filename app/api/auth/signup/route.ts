import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { badRequest, json } from "@/lib/http";
import { clientKey, rateLimit } from "@/lib/rateLimit";
import { startSession } from "@/lib/session";
import { firstError, readJson, signupSchema } from "@/lib/validation";

export async function POST(req: Request) {
  if (process.env.REGISTRATION_ENABLED === "false") {
    return json({ error: "Les inscriptions sont fermées" }, 403);
  }
  if (!rateLimit(`signup:${clientKey(req)}`, 10, 60 * 60_000)) {
    return json({ error: "Trop de tentatives, réessaie plus tard" }, 429);
  }
  const parsed = signupSchema.safeParse(await readJson(req));
  if (!parsed.success) return badRequest(firstError(parsed.error));
  const { name, email, password, timezone } = parsed.data;

  if (await prisma.user.findUnique({ where: { email } })) {
    return badRequest("Un compte existe déjà avec cet e-mail");
  }
  const user = await prisma.user.create({
    data: { name, email, timezone, passwordHash: await bcrypt.hash(password, 12) },
  });
  await startSession(user.id);
  return json({ ok: true }, 201);
}
