import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";

export async function GET() {
  try {
    const db = await getDatabase();
    await db.command({ ping: 1 });

    return NextResponse.json(
      {
        ok: true,
        service: "database",
        status: "up",
      },
      { status: 200 },
    );
  } catch (error: unknown) {
    const err = error as { name?: string; message?: string };

    return NextResponse.json(
      {
        ok: false,
        service: "database",
        status: "down",
        errorCode: err?.name ?? "DB_CONNECTION_ERROR",
        message: "Database non raggiungibile o configurazione non valida.",
      },
      { status: 503 },
    );
  }
}
