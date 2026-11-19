export type ApiResult = { ok: true } | { ok: false; error: string };

/** Appel JSON côté navigateur ; renvoie toujours un résultat, jamais d'exception. */
export async function api(path: string, method: string, body?: unknown): Promise<ApiResult> {
  try {
    const res = await fetch(path, {
      method,
      headers: { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    if (res.ok) return { ok: true };
    const data = await res.json().catch(() => ({}));
    return { ok: false, error: data.error ?? "Une erreur est survenue" };
  } catch {
    return { ok: false, error: "Connexion impossible, réessaie" };
  }
}
