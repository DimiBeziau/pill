"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/client";

// `suppressHydrationWarning` : les gestionnaires de mots de passe (Dashlane, 1Password…) injectent
// des attributs dans ces champs avant l'hydratation ; ce n'est pas une vraie divergence.
export function AuthForm({ mode, canSignup }: { mode: "login" | "signup"; canSignup: boolean }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const signup = mode === "signup";

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    setError(null);
    const res = await api(`/api/auth/${mode}`, "POST", {
      name: f.get("name"),
      email: f.get("email"),
      password: f.get("password"),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    });
    if (res.ok) {
      router.replace("/");
      router.refresh();
    } else {
      setError(res.error);
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-6 px-4 py-10">
      <div className="text-center">
        <div className="text-5xl">💊</div>
        <h1 className="mt-2 text-3xl font-bold">Pill</h1>
        <p className="text-muted">Ne plus jamais oublier sa pilule.</p>
      </div>
      <form onSubmit={submit} className="card flex flex-col gap-3" suppressHydrationWarning>
        {signup && (
          <input className="field" name="name" placeholder="Prénom" autoComplete="given-name" required suppressHydrationWarning />
        )}
        <input className="field" name="email" type="email" placeholder="E-mail" autoComplete="email" required suppressHydrationWarning />
        <input
          className="field"
          name="password"
          type="password"
          placeholder={signup ? "Mot de passe (8 caractères min.)" : "Mot de passe"}
          autoComplete={signup ? "new-password" : "current-password"}
          minLength={signup ? 8 : undefined}
          required
          suppressHydrationWarning
        />
        {error && <p role="alert" className="text-sm text-bad">{error}</p>}
        <button className="btn-primary" disabled={busy} suppressHydrationWarning>
          {signup ? "Créer mon espace" : "Se connecter"}
        </button>
      </form>
      {canSignup && (
        <p className="text-center text-sm text-muted">
          {signup ? "Déjà un compte ? " : "Pas encore de compte ? "}
          <Link className="font-semibold text-brand" href={signup ? "/login" : "/signup"}>
            {signup ? "Se connecter" : "Créer un espace"}
          </Link>
        </p>
      )}
    </main>
  );
}
