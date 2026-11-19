export const dynamic = "force-dynamic";

import { AuthForm } from "@/components/AuthForm";

export default function LoginPage() {
  return <AuthForm mode="login" canSignup={process.env.REGISTRATION_ENABLED !== "false"} />;
}
