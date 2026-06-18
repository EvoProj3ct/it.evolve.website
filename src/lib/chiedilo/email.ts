import { Resend } from "resend";

type EventRegistrationConfirmationInput = {
  nome: string;
  email: string;
};

type ConfirmationEmailResult =
  | { status: "sent"; sentAt: Date; error: null }
  | { status: "failed"; sentAt: null; error: string };

const EVENT_REGISTRATION_SUBJECT = "Iscrizione confermata a Chiedilo all'IA";

function sanitizeEmailError(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message.slice(0, 240);
  }

  if (typeof error === "object" && error !== null && "message" in error) {
    const msg = (error as { message: string }).message;
    if (typeof msg === "string" && msg.length > 0) {
      return msg.slice(0, 240);
    }
  }

  return "Invio email non riuscito";
}

function buildText({ nome }: EventRegistrationConfirmationInput) {
  return `Ciao ${nome},\n\nla tua iscrizione all'evento "Chiedilo all'IA" è stata registrata correttamente.\n\nGrazie,\nTeam Evolve`;
}

function buildHtml({ nome }: EventRegistrationConfirmationInput) {
  return `
    <div style="font-family: Arial, sans-serif; color: #18181b; line-height: 1.6;">
      <p>Ciao ${nome},</p>
      <p>la tua iscrizione all'evento <strong>"Chiedilo all'IA"</strong> è stata registrata correttamente.</p>
      <p>Grazie,<br />Team Evolve</p>
    </div>
  `;
}

export async function sendEventRegistrationConfirmation(
  input: EventRegistrationConfirmationInput,
): Promise<ConfirmationEmailResult> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.SENDING_EMAIL_FROM?.trim();

  if (!apiKey || !from) {
    return {
      status: "failed",
      sentAt: null,
      error: "Configurazione email mancante",
    };
  }

  try {
    const resend = new Resend(apiKey);
    const result = await resend.emails.send({
      from,
      to: input.email,
      subject: EVENT_REGISTRATION_SUBJECT,
      text: buildText(input),
      html: buildHtml(input),
    });

    if (result.error) {
      return {
        status: "failed",
        sentAt: null,
        error: sanitizeEmailError(result.error),
      };
    }

    return {
      status: "sent",
      sentAt: new Date(),
      error: null,
    };
  } catch (error) {
    return {
      status: "failed",
      sentAt: null,
      error: sanitizeEmailError(error),
    };
  }
}
