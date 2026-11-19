import { redirect } from "next/navigation";
import { NavBar } from "@/components/NavBar";
import { getCurrentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  if (!(await getCurrentUser())) redirect("/login");
  return (
    <>
      <main className="mx-auto max-w-md px-4 pb-28 pt-6">{children}</main>
      <NavBar />
    </>
  );
}
