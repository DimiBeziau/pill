import { badRequest, json, requireUser } from "@/lib/http";
import { undoTaken } from "@/lib/intake";
import { dateBodySchema, firstError, readJson } from "@/lib/validation";

export async function POST(req: Request) {
  const { user, response } = await requireUser();
  if (response) return response;
  const parsed = dateBodySchema.safeParse(await readJson(req));
  if (!parsed.success) return badRequest(firstError(parsed.error));

  const result = await undoTaken(user, parsed.data.date);
  return result.ok ? json({ ok: true }) : badRequest(result.error);
}
