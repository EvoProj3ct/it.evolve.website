import { createHash, timingSafeEqual } from "crypto";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { eventRegistrationSchema, normalizeEmail } from "@/lib/event-registration-schema";
import { getDatabase } from "@/lib/mongodb";

const COLLECTION_NAME = "event_registrations";
const POLICY_VERSION = "2026-05-v1";
const CONSENT_VERSION = "event-registration-consent-v1";

type MongoLikeError = {
  code?: number;
  name?: string;
  message?: string;
};

function hashValue(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function isValidRegistrationToken(inputToken: string): boolean {
  const expectedToken = process.env.PRIVATE_EVENT_REGISTRATION_TOKEN?.trim();

  if (!expectedToken) {
    return false;
  }

  const input = Buffer.from(inputToken.trim());
  const expected = Buffer.from(expectedToken);

  if (input.length !== expected.length) {
    return false;
  }

  return timingSafeEqual(input, expected);
}

export async function POST(request: Request) {
  let stage = "parse_request";
  try {
    const payload = await request.json();
    stage = "validate_payload";
    const parsed = eventRegistrationSchema.safeParse(payload);

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

    stage = "validate_token";
    if (!isValidRegistrationToken(input.registrationToken)) {
      return NextResponse.json({ error: "Risorsa non disponibile" }, { status: 404 });
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
        { error: "Risulta già una registrazione per questo evento con questo indirizzo email." },
        { status: 409 },
      );
    }

    const document = {
      eventId: input.eventId,
      venue: input.venue,
      nome: input.nome,
      cognome: input.cognome,
      email: input.email,
      emailLower,
      profiloProfessionale: input.profiloProfessionale,
      additionalGuests: input.additionalGuests,
      sourceType: "private_registration",
      status: "registered",
      consents: {
        privacyAccepted: input.privacyAccepted,
        dataSecurityAccepted: input.dataSecurityAccepted,
        acceptedAt: now,
        policyVersion: POLICY_VERSION,
        consentVersion: CONSENT_VERSION,
      },
      security: {
        ipHash: hashValue(ip),
        userAgent,
        registrationTokenHash: hashValue(input.registrationToken),
      },
      createdAt: now,
      updatedAt: now,
    };

    stage = "insert_document";
    await collection.insertOne(document);

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error: unknown) {
    const mongoError = error as MongoLikeError;

    if (mongoError?.code === 11000) {
      return NextResponse.json(
        { error: "Risulta già una registrazione per questo evento con questo indirizzo email." },
        { status: 409 },
      );
    }

    console.error("event-registration-failure", {
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

    return NextResponse.json({ error: "Errore server durante il salvataggio della registrazione." }, { status: 500 });
  }
}
