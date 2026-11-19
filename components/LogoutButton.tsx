"use client";

import { useRouter } from "next/navigation";
import { api } from "@/lib/client";

export function LogoutButton() {
  const router = useRouter();
  return (
    <button
      className="btn-ghost"
      onClick={async () => {
        await api("/api/auth/logout", "POST");
        router.replace("/login");
        router.refresh();
      }}
    >
      Se déconnecter
    </button>
  );
}
