import { MongoClient } from "mongodb";

function extractDatabaseName(connectionUri: string): string | null {
  const withoutQuery = connectionUri.split("?")[0] ?? "";
  const dbName = withoutQuery.split("/").pop() ?? "";
  return dbName.trim().length > 0 ? dbName.trim() : null;
}

declare global {
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

function getMongoConfig() {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    throw new Error("Missing MONGODB_URI environment variable");
  }

  const dbName = extractDatabaseName(uri);

  if (!dbName) {
    throw new Error("MONGODB_URI must include an explicit database name (e.g. mongodb+srv://user:pass@host/<dbName>)");
  }

  return { uri, dbName };
}

function getClientPromise(uri: string) {
  if (!global._mongoClientPromise) {
    const client = new MongoClient(uri);
    global._mongoClientPromise = client.connect();
  }

  return global._mongoClientPromise;
}

export async function getDatabase() {
  const { uri, dbName } = getMongoConfig();
  const clientPromise = getClientPromise(uri);
  const connectedClient = await clientPromise;
  return connectedClient.db(dbName);
}
