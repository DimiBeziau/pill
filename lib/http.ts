import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";

export function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

export function badRequest(message: string) {
  return json({ error: message }, 400);
}

/** Renvoie l'utilisatrice connectée, ou une réponse 401 à retourner telle quelle. */
export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) return { user: null, response: json({ error: "Non connectée" }, 401) } as const;
  return { user, response: null } as const;
}
