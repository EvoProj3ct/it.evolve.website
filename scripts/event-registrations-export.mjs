import { MongoClient } from "mongodb";

const COLLECTION_NAME = "event_registrations";
const EVENT_ID = "chiedilo-all-ia-bcc-paliano";

const MODE_LIST = "list";
const MODE_EMAILS = "emails";
const MODE_CSV = "csv";
const MODE_ALL = "all";

function usage() {
  console.log(`
Utilizzo:
  node --env-file=.env.local scripts/event-registrations-export.mjs [modalità]

Modalità:
  list        Lista partecipanti (nome, cognome, email)
  emails      Solo indirizzi email (uno per riga)
  csv         Formato CSV (nome,cognome,email)
  (vuoto)     Mostra tutte le modalità
`);
}

function parseArgs() {
  const args = process.argv.slice(2);
  if (args.length === 0) return MODE_ALL;
  const mode = args[0].toLowerCase();
  if ([MODE_LIST, MODE_EMAILS, MODE_CSV].includes(mode)) return mode;
  console.error(`Modalità sconosciuta: "${args[0]}"`);
  usage();
  process.exit(1);
}

function printList(docs) {
  console.log("\n=== Lista Partecipanti ===\n");
  for (const doc of docs) {
    console.log(`${doc.nome.padEnd(12)} ${doc.cognome.padEnd(12)} ${doc.email}`);
  }
  console.log(`\nTotale: ${docs.length}\n`);
}

function printEmailList(docs) {
  console.log("\n=== Email List ===\n");
  for (const doc of docs) {
    console.log(doc.email);
  }
  console.log(`\nTotale: ${docs.length}\n`);
}

function printCsv(docs) {
  console.log("nome,cognome,email");
  for (const doc of docs) {
    const n = doc.nome.includes(",") ? `"${doc.nome}"` : doc.nome;
    const c = doc.cognome.includes(",") ? `"${doc.cognome}"` : doc.cognome;
    console.log(`${n},${c},${doc.email}`);
  }
}

async function main() {
  const mode = parseArgs();

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("ERRORE: MONGODB_URI non impostata. Usa --env-file=.env.local");
    usage();
    process.exit(1);
  }

  const client = new MongoClient(uri);
  await client.connect();

  try {
    const db = client.db();
    const collection = db.collection(COLLECTION_NAME);

    const docs = await collection
      .find({ eventId: EVENT_ID })
      .project({ _id: 0, nome: 1, cognome: 1, email: 1 })
      .sort({ createdAt: 1 })
      .toArray();

    if (mode === MODE_ALL) {
      printList(docs);
      printEmailList(docs);
      console.log("=== CSV ===\n");
      printCsv(docs);
    } else if (mode === MODE_LIST) {
      printList(docs);
    } else if (mode === MODE_EMAILS) {
      printEmailList(docs);
    } else if (mode === MODE_CSV) {
      printCsv(docs);
    }
  } finally {
    await client.close();
  }
}

main().catch((err) => {
  console.error("Errore:", err.message);
  process.exit(1);
});
