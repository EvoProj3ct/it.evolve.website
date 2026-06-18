import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI;

if (!uri) {
  throw new Error("Missing MONGODB_URI environment variable");
}

function extractDatabaseName(connectionUri: string): string | null {
  const withoutQuery = connectionUri.split("?")[0] ?? "";
  const dbName = withoutQuery.split("/").pop() ?? "";
  return dbName.trim().length > 0 ? dbName.trim() : null;
}

const dbNameFromUri = extractDatabaseName(uri);

if (!dbNameFromUri) {
  throw new Error("MONGODB_URI must include an explicit database name (e.g. mongodb+srv://user:pass@host/<dbName>)");
}

const dbName: string = dbNameFromUri;

declare global {
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

const client = new MongoClient(uri);

const clientPromise = global._mongoClientPromise ?? client.connect();

if (process.env.NODE_ENV !== "production") {
  global._mongoClientPromise = clientPromise;
}

export async function getDatabase() {
  const connectedClient = await clientPromise;
  return connectedClient.db(dbName);
}
