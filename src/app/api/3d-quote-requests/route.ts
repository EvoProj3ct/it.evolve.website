import { NextResponse } from "next/server";
import { Resend } from "resend";

export const runtime = "nodejs";

const maxDwgSize = 10 * 1024 * 1024;
const materials = new Set(["PLA", "PETG", "ABS", "ASA", "TPU", "Nylon"]);
const recipient = "infoevolvecompany@gmail.com";

export async function POST(request: Request) {
  const contentLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > maxDwgSize + 1024 * 1024) {
    return NextResponse.json({ error: "Il file DWG supera il limite di 10 MB." }, { status: 413 });
  }

  try {
    const form = await request.formData();
    const field = (name: string) => {
      const value = form.get(name);
      return typeof value === "string" ? value.trim() : "";
    };
    if (field("website")) return NextResponse.json({ ok: true }, { status: 201 });
    const name = field("name");
    const email = field("email");
    const model = field("model");
    const material = field("material");
    const dimensionValues = [field("width"), field("height"), field("depth")];
    const dimensionNumbers = dimensionValues.map(Number);
    const file = form.get("dwg");

    if (name.length < 2 || name.length > 100 || email.length > 160 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Inserisci nome ed email validi." }, { status: 422 });
    }
    if (model.length > 160 || !materials.has(material) || dimensionValues.some((value, index) => !/^\d{1,4}$/.test(value) || dimensionNumbers[index] < 1 || dimensionNumbers[index] > 2000)) {
      return NextResponse.json({ error: "Controlla modello, materiale e dimensioni." }, { status: 422 });
    }
    if (field("privacyAccepted") !== "on") {
      return NextResponse.json({ error: "Accetta l'informativa privacy per inviare la richiesta." }, { status: 422 });
    }
    if (file !== null && !(file instanceof File)) {
      return NextResponse.json({ error: "Il file DWG non è valido." }, { status: 422 });
    }
    if (!model && !file) {
      return NextResponse.json({ error: "Seleziona un modello o carica un DWG." }, { status: 422 });
    }

    let attachment: { filename: string; content: Buffer } | undefined;
    if (file && file.size > 0) {
      const filename = file.name.split(/[\\/]/).pop() ?? "";
      if (!filename.toLowerCase().endsWith(".dwg") || filename.length > 160 || file.size === 0 || file.size > maxDwgSize) {
        return NextResponse.json({ error: "Seleziona un file DWG di massimo 10 MB." }, { status: 422 });
      }
      attachment = { filename, content: Buffer.from(await file.arrayBuffer()) };
    }

    const apiKey = process.env.RESEND_API_KEY?.trim();
    const from = process.env.SENDING_EMAIL_FROM?.trim();
    if (!apiKey || !from) {
      return NextResponse.json({ error: "Servizio email non disponibile. Riprova più tardi." }, { status: 503 });
    }

    const lines = [
      "Nuova richiesta di preventivo 3D",
      "Nome: " + name,
      "Email: " + email,
      "Modello: " + (model || "DWG personalizzato"),
      "Materiale: " + material,
      "Dimensioni (mm): " + dimensionValues.join(" × "),
      "DWG: " + (attachment?.filename ?? "non allegato"),
    ];
    const result = await new Resend(apiKey).emails.send({
      from,
      to: recipient,
      replyTo: email,
      subject: "Nuova richiesta di preventivo 3D",
      text: lines.join("\n"),
      ...(attachment ? { attachments: [attachment] } : {}),
    });

    if (result.error) {
      console.error("3d-quote-email-failure", result.error);
      return NextResponse.json({ error: "Invio non riuscito. Riprova più tardi." }, { status: 502 });
    }
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    console.error("3d-quote-request-failure", error);
    return NextResponse.json({ error: "Invio non riuscito. Riprova più tardi." }, { status: 500 });
  }
}
