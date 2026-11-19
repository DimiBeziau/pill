import { z } from "zod";
import { isValidDate, isValidTime, isValidTimezone } from "@/lib/time";

export const emailSchema = z.string().trim().toLowerCase().email("Adresse e-mail invalide").max(200);
export const passwordSchema = z.string().min(8, "8 caractères minimum").max(200);
export const timezoneSchema = z.string().refine(isValidTimezone, "Fuseau horaire invalide");

export const loginSchema = z.object({ email: emailSchema, password: z.string().min(1).max(200) });

export const signupSchema = z.object({
  name: z.string().trim().min(1, "Prénom requis").max(60),
  email: emailSchema,
  password: passwordSchema,
  timezone: timezoneSchema.default("Europe/Paris"),
});

export const settingsSchema = z.object({
  name: z.string().trim().min(1, "Prénom requis").max(60),
  reminderTime: z.string().refine(isValidTime, "Heure invalide (HH:MM)"),
  timezone: timezoneSchema,
  snoozeMinutes: z.number().int().min(5).max(240),
  repeatMinutes: z.number().int().refine((n) => n === 0 || (n >= 5 && n <= 180), "Entre 5 et 180 min, ou 0"),
});

export const dateBodySchema = z.object({
  date: z.string().refine(isValidDate, "Date invalide").optional(),
});

export const subscribeSchema = z.object({
  endpoint: z.string().url().max(2000),
  keys: z.object({ p256dh: z.string().min(1).max(500), auth: z.string().min(1).max(500) }),
});

export const unsubscribeSchema = z.object({ endpoint: z.string().url().max(2000) });

/** Lit un corps JSON ; un corps vide/invalide est traité comme `{}`. */
export async function readJson(req: Request): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    return {};
  }
}

export function firstError(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Données invalides";
}
