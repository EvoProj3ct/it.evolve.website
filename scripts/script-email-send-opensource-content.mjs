import { parseGeneralEventIdArgs } from "./lib/args.mjs";
import { withDatabase } from "./lib/mongo.mjs";
import { dedupeEmails } from "./lib/normalize.mjs";
import { safeFilenamePart, writeJsonOutput } from "./lib/output.mjs";

const SCRIPT_NAME = "script-email-send-opensource-content";
const COLLECTION_NAME = "consultation_requests";

async function main() {
  const { eventId } = parseGeneralEventIdArgs();
  const filters = {
    eventId,
    "consents.kitPostEventoAccepted": true,
  };

  const docs = await withDatabase(async (db) => {
    return await db
      .collection(COLLECTION_NAME)
      .find(filters)
      .project({ _id: 0, email: 1, emailLower: 1, createdAt: 1 })
      .sort({ createdAt: 1 })
      .toArray();
  });
  const emails = dedupeEmails(docs);
  const payload = {
    generatedAt: new Date().toISOString(),
    script: SCRIPT_NAME,
    collection: COLLECTION_NAME,
    filters,
    count: emails.length,
    emails,
    emailsCommaSeparated: emails.join(","),
  };
  const filename = `email-send-opensource-content-${safeFilenamePart(eventId)}.json`;
  const outputPath = await writeJsonOutput(filename, payload);

  console.log(`OK: file generato ${outputPath}`);
  console.log(`Totale elementi: ${emails.length}`);
}

main().catch((err) => {
  console.error(`Errore: ${err.message}`);
  process.exit(1);
});
