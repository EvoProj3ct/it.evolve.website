import { MongoClient } from "mongodb";

export async function withDatabase(callback) {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    throw new Error("MONGODB_URI non impostata. Esegui con: node --env-file=.env.local ...");
  }

  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db();
    return await callback(db);
  } finally {
    await client.close();
  }
}
