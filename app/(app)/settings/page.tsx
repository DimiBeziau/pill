import { LogoutButton } from "@/components/LogoutButton";
import { PushSetup } from "@/components/PushSetup";
import { SettingsForm } from "@/components/SettingsForm";
import { getCurrentUser } from "@/lib/session";

export default async function SettingsPage() {
  const user = (await getCurrentUser())!;
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">Réglages</h1>
      <PushSetup vapidPublicKey={process.env.VAPID_PUBLIC_KEY ?? ""} />
      <SettingsForm
        initial={{
          name: user.name,
          reminderTime: user.reminderTime,
          timezone: user.timezone,
          snoozeMinutes: user.snoozeMinutes,
          repeatMinutes: user.repeatMinutes,
        }}
      />
      <p className="text-center text-sm text-muted">{user.email}</p>
      <LogoutButton />
    </div>
  );
}
