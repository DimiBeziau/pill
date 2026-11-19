export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { AuthForm } from "@/components/AuthForm";

export default function SignupPage() {
  if (process.env.REGISTRATION_ENABLED === "false") redirect("/login");
  return <AuthForm mode="signup" canSignup />;
}
