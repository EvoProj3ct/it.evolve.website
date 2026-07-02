import { parseEventRegistrationArgs } from "./lib/args.mjs";
import { withDatabase } from "./lib/mongo.mjs";
import { additionalGuestsToMinimumCount, normalizeEmail } from "./lib/normalize.mjs";
import { safeFilenamePart, writeJsonOutput } from "./lib/output.mjs";

const SCRIPT_NAME = "script-how-many-subscribers";
const COLLECTION_NAME = "event_registrations";

async function main() {
  const { eventId, venue } = parseEventRegistrationArgs();
  const filters = { eventId, venue, status: "registered" };

  const docs = await withDatabase(async (db) => {
    return await db
      .collection(COLLECTION_NAME)
      .find(filters)
      .project({ _id: 0, nome: 1, cognome: 1, email: 1, emailLower: 1, additionalGuests: 1, createdAt: 1 })
      .sort({ createdAt: 1 })
      .toArray();
  });

  const items = docs.map((doc) => {
    const additionalGuestsCounted = additionalGuestsToMinimumCount(doc.additionalGuests);

    return {
      nome: doc.nome ?? "",
      cognome: doc.cognome ?? "",
      email: normalizeEmail(doc.emailLower) || normalizeEmail(doc.email),
      additionalGuests: doc.additionalGuests ?? "0",
      additionalGuestsCounted,
      totalPeopleForRegistration: 1 + additionalGuestsCounted,
    };
  });

  const additionalGuestsMinimumCount = items.reduce((total, item) => total + item.additionalGuestsCounted, 0);
  const totalPeopleMinimumCount = items.reduce((total, item) => total + item.totalPeopleForRegistration, 0);
  const payload = {
    generatedAt: new Date().toISOString(),
    script: SCRIPT_NAME,
    collection: COLLECTION_NAME,
    filters,
    summary: {
      registrationsCount: docs.length,
      mainSubscribersCount: docs.length,
      additionalGuestsMinimumCount,
      totalPeopleMinimumCount,
    },
    items,
    warnings: ["additionalGuests='3-plus' viene conteggiato come 3 persone aggiuntive minime."],
  };
  const filename = `how-many-subscribers-${safeFilenamePart(eventId)}-${safeFilenamePart(venue)}.json`;
  const outputPath = await writeJsonOutput(filename, payload);

  console.log(`OK: file generato ${outputPath}`);
  console.log(`Registrazioni: ${docs.length}`);
  console.log(`Totale persone minimo: ${totalPeopleMinimumCount}`);
}

main().catch((err) => {
  console.error(`Errore: ${err.message}`);
  process.exit(1);
});
