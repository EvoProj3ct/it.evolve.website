import { z } from "zod";

export const EVENT_REGISTRATION_EVENT_ID = "chiedilo-all-ia-bcc-paliano";

export const BCC_VENUES = [
  { value: "paliano", label: "Paliano", enabled: true },
  { value: "serrone", label: "Serrone", enabled: false },
  { value: "sora", label: "Sora", enabled: false },
  { value: "colleferro", label: "Colleferro", enabled: false },
  { value: "valmontone", label: "Valmontone", enabled: false },
] as const;

export const PROFESSIONAL_PROFILE_OPTIONS = [
  { value: "dipendente", label: "Dipendente" },
  { value: "libero-professionista", label: "Libero professionista" },
  { value: "imprenditore", label: "Imprenditore" },
  { value: "altro", label: "Altro" },
] as const;

export const ADDITIONAL_GUEST_OPTIONS = [
  { value: "0", label: "Nessuna" },
  { value: "1", label: "1 persona" },
  { value: "2", label: "2 persone" },
  { value: "3-plus", label: "3 o più persone" },
] as const;

export const eventRegistrationSchema = z.object({
  registrationToken: z.string().trim().min(32).max(160),
  eventId: z.literal(EVENT_REGISTRATION_EVENT_ID),
  nome: z.string().trim().min(2).max(80),
  cognome: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(160),
  venue: z.literal("paliano"),
  profiloProfessionale: z.enum([
    "dipendente",
    "libero-professionista",
    "imprenditore",
    "altro",
  ]),
  additionalGuests: z.enum(["0", "1", "2", "3-plus"]),
  privacyAccepted: z.literal(true),
  dataSecurityAccepted: z.literal(true),
  website: z.string().max(0).optional().default(""),
});

export type EventRegistrationInput = z.infer<typeof eventRegistrationSchema>;

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
