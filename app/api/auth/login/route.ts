import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { json } from "@/lib/http";
import { clientKey, rateLimit } from "@/lib/rateLimit";
import { startSession } from "@/lib/session";
import { loginSchema, readJson } from "@/lib/validation";

// Hash factice : on compare toujours, pour ne pas révéler par le temps de réponse si l'e-mail existe.
const DUMMY_HASH = "$2b$12$CwTycUXWue0Thq9StjUM0uJ8.0pQ0o5ZB0u6jX0cYk2cH0Gm0o9uK";

export async function POST(req: Request) {
  const parsed = loginSchema.safeParse(await readJson(req));
  if (!parsed.success) return json({ error: "Identifiants invalides" }, 400);
  const { email, password } = parsed.data;

  if (!rateLimit(`login:${clientKey(req)}:${email}`, 8, 15 * 60_000)) {
    return json({ error: "Trop de tentatives, réessaie dans quelques minutes" }, 429);
  }

  const user = await prisma.user.findUnique({ where: { email } });
  const ok = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !ok) return json({ error: "E-mail ou mot de passe incorrect" }, 401);

  await startSession(user.id);
  return json({ ok: true });
}
