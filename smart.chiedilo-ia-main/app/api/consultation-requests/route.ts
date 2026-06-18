import { createHash } from "crypto";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { consultationRequestSchema, normalizeEmail } from "@/lib/consultation-schema";
import { getDatabase } from "@/lib/mongodb";

const COLLECTION_NAME = "consultation_requests";
const POLICY_VERSION = "2026-05-v1";
const CONSENT_VERSION = "consent-v1";

type MongoLikeError = {
  code?: number;
  name?: string;
  message?: string;
};

export async function POST(request: Request) {
  let stage = "parse_request";
  try {
    const payload = await request.json();
    stage = "validate_payload";
    const parsed = consultationRequestSchema.safeParse(payload);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Validazione fallita",
          issues: parsed.error.flatten(),
        },
        { status: 422 },
      );
    }

    const input = parsed.data;

    if (input.website) {
      return NextResponse.json({ error: "Richiesta non valida" }, { status: 400 });
    }

    stage = "connect_database";
    const db = await getDatabase();
    const collection = db.collection(COLLECTION_NAME);

    const hdrs = await headers();
    const ip = hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    const userAgent = hdrs.get("user-agent") ?? "unknown";
    const emailLower = normalizeEmail(input.email);
    const now = new Date();

    stage = "check_duplicate";
    const existing = await collection.findOne(
      { eventId: input.eventId, emailLower },
      { projection: { _id: 1 } },
    );

    if (existing) {
      return NextResponse.json(
        { error: "Esiste già una richiesta per questo evento con questo indirizzo email." },
        { status: 409 },
      );
    }

    const document = {
      nome: input.nome,
      cognome: input.cognome,
      email: input.email,
      emailLower,
      eventId: input.eventId,
      telefono: input.telefono || null,
      profiloProfessionale: input.profiloProfessionale || null,
      interesseEventiFormativi: input.interesseEventiFormativi || null,
      usoIaQuotidiano: input.usoIaQuotidiano || null,
      kitPostEventoAccepted: input.kitPostEventoAccepted ?? false,
      sourcePage: input.sourcePage,
      sourceContext: input.sourceContext || null,
      sourceType: "public_form",
      status: "new",
      priorityScore: 0,
      prioritySignals: [],
      consents: {
        privacyAccepted: input.privacyAccepted,
        dataSecurityAccepted: input.dataSecurityAccepted,
        kitPostEventoAccepted: input.kitPostEventoAccepted ?? false,
        trainingEventsAccepted: input.trainingEventsAccepted ?? false,
        productsServicesAccepted: input.productsServicesAccepted ?? false,
        acceptedAt: now,
        policyVersion: POLICY_VERSION,
        consentVersion: CONSENT_VERSION,
      },
      security: {
        ipHash: createHash("sha256").update(ip).digest("hex"),
        userAgent,
      },
      createdAt: now,
      updatedAt: now,
      contactedAt: null,
      completedAt: null,
      tags: [],
      internalNotes: null,
    };

    stage = "insert_document";
    await collection.insertOne(document);

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error: unknown) {
    const mongoError = error as MongoLikeError;

    if (mongoError?.code === 11000) {
      return NextResponse.json(
        { error: "Esiste già una richiesta per questo evento con questo indirizzo email." },
        { status: 409 },
      );
    }

    console.error("consultation-request-failure", {
      stage,
      name: mongoError?.name,
      code: mongoError?.code,
      message: mongoError?.message,
    });

    if (mongoError?.name === "MongoServerSelectionError") {
      return NextResponse.json({ error: "Servizio temporaneamente non disponibile. Riprova tra pochi minuti." }, { status: 503 });
    }

    if (mongoError?.name === "MongoServerError" && typeof mongoError?.message === "string" && mongoError.message.toLowerCase().includes("not authorized")) {
      return NextResponse.json({ error: "Configurazione database non autorizzata." }, { status: 500 });
    }

    return NextResponse.json({ error: "Errore server durante il salvataggio della richiesta." }, { status: 500 });
  }
}
