import { z } from "zod";

export const consultationRequestSchema = z.object({
  eventId: z.string().trim().min(1).max(80).default("evolve-generale"),
  nome: z.string().trim().min(2).max(80),
  cognome: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(160),
  telefono: z.string().trim().max(30).optional().or(z.literal("")),
  profiloProfessionale: z.enum(["dipendente", "libero-professionista", "imprenditore", "altro"]).optional().or(z.literal("")),
  interesseEventiFormativi: z.enum(["si", "no", "forse"]).optional().or(z.literal("")),
  usoIaQuotidiano: z.enum(["mai", "qualche-volta", "spesso", "quotidianamente"]).optional().or(z.literal("")),
  contactReason: z.enum(["aggiornamenti", "materiali", "prima-consulenza-gratuita", "altro"]).optional().default("aggiornamenti"),
  kitPostEventoAccepted: z.boolean().optional().default(false),
  trainingEventsAccepted: z.boolean().optional().default(false),
  productsServicesAccepted: z.boolean().optional().default(false),
  privacyAccepted: z.literal(true),
  dataSecurityAccepted: z.literal(true),
  sourcePage: z.string().trim().min(1).max(80),
  sourceContext: z.string().trim().max(120).optional().or(z.literal("")),
  website: z.string().max(0).optional().default(""),
});

export type ConsultationRequestInput = z.infer<typeof consultationRequestSchema>;

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
