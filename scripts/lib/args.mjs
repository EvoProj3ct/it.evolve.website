export const DEFAULT_EVENT_REGISTRATION_EVENT_ID = "chiedilo-all-ia-bcc-paliano";
export const DEFAULT_GENERAL_EVENT_ID = "evolve-generale";

const VALID_VENUES = new Set(["paliano", "serrone", "sora", "colleferro", "valmontone"]);

export function parseCliArgs(argv = process.argv.slice(2)) {
  const args = {};

  for (const arg of argv) {
    if (!arg.startsWith("--") || !arg.includes("=")) {
      throw new Error(`Argomento non valido: ${arg}. Usa il formato --key=value.`);
    }

    const separatorIndex = arg.indexOf("=");
    const key = arg.slice(2, separatorIndex).trim();
    const value = arg.slice(separatorIndex + 1).trim();

    if (!key) {
      throw new Error(`Argomento non valido: ${arg}. Chiave mancante.`);
    }

    args[key] = value;
  }

  return args;
}

export function requireVenue(value) {
  if (!value) {
    throw new Error("Venue mancante. Esempio: --venue=paliano");
  }

  if (!VALID_VENUES.has(value)) {
    throw new Error(
      `Venue non valida: ${value}. Valori ammessi: ${Array.from(VALID_VENUES).join(", ")}.`,
    );
  }

  return value;
}

export function parseEventRegistrationArgs() {
  const args = parseCliArgs();

  return {
    venue: requireVenue(args.venue),
    eventId: args.eventId || DEFAULT_EVENT_REGISTRATION_EVENT_ID,
  };
}

export function parseOptionalEventIdArgs() {
  const args = parseCliArgs();

  return {
    eventId: args.eventId || undefined,
  };
}

export function parseGeneralEventIdArgs() {
  const args = parseCliArgs();

  return {
    eventId: args.eventId || DEFAULT_GENERAL_EVENT_ID,
  };
}
