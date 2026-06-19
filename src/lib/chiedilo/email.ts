import { Resend } from "resend";

type EventRegistrationConfirmationInput = {
  nome: string;
  email: string;
  attachmentBuffer?: Buffer;
};

type ConfirmationEmailResult =
  | { status: "sent"; sentAt: Date; error: null }
  | { status: "failed"; sentAt: null; error: string };

const EVENT_REGISTRATION_SUBJECT = 'Ti aspettiamo a "Chiedilo all\'IA" — programma e informazioni utili';

const GOOGLE_MAPS_URL =
  "https://www.google.com/maps/place/Piazza+Marcantonio+Colonna,+03018+Paliano+FR/@41.8052331,13.0528577,17z/data=!3m1!4b1!4m6!3m5!1s0x132f89df76a94807:0x4c061a281339db8d!8m2!3d41.8052331!4d13.0554326!16s%2Fg%2F11btn17nw4?entry=ttu&g_ep=EgoyMDI2MDYxNi4wIKXMDSoASAFQAw%3D%3D";

function getSiteUrl(): string {
  return (
    process.env.SITE_URL?.trim() ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined) ||
    "https://evolvecompany.tech"
  );
}

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
  return `Ciao ${nome},

manca poco a Chiedilo all'IA, l'incontro pratico pensato per capire come dialogare con l'intelligenza artificiale in modo pi\u00f9 chiaro, utile e consapevole.

Ti aspettiamo venerd\u00ec 26 giugno 2026 presso Piazza Marcantonio Colonna, Paliano (FR).

L'accoglienza dei partecipanti inizier\u00e0 dalle ore 17:00. All'arrivo sar\u00e0 prevista una welcome bag e, a seguire, entreremo nel vivo dell'evento con un percorso guidato tra esempi concreti, casi d'uso, demo live, rischi, governance e spazio domande.

Durante l'incontro parleremo di:
- come trasformare una domanda vaga in un prompt pi\u00f9 efficace;
- come usare l'IA in modo pratico nel lavoro, nell'impresa e nelle attivit\u00e0 quotidiane;
- quali attenzioni mantenere su privacy, affidabilit\u00e0, bias e controllo umano;
- quali primi passi concreti possono aiutare ad avvicinarsi all'IA con maggiore consapevolezza.

Il programma prevede anche un momento finale di confronto informale con apericena.

A guidare l'evento:
- Luca De Angelis \u2014 presentatore, Presidente Evolve Srls e Modellatore 3D
- Luca Marinelli \u2014 relatore, Software Developer AI
- Emanuele Ienna \u2014 relatore, Divulgatore e Sviluppatore AI
- Gian Marco Marinelli \u2014 relatore, Consulente Informatico

Speaker di eccezione:
- Francesca Calamari, assessore turismo, politiche giovanili e pari opportunit\u00e0 del comune di Paliano
- Roberto Romani, responsabile sviluppo e marketing BCC Paliano

Luogo:
Piazza Marcantonio Colonna, Paliano (FR)

Google Maps:
${GOOGLE_MAPS_URL}

In allegato trovi il cronoprogramma completo dell'evento.

Per ulteriori informazioni:
Email: infoevolvecompany@gmail.com
Sito: evolvecompany.tech/chiedilo-all-ia

Ti aspettiamo a Paliano per un pomeriggio di confronto, domande e sperimentazione concreta sull'IA.

A presto,
Il team Evolve`;
}

function buildHtml({ nome }: EventRegistrationConfirmationInput) {
  const siteUrl = getSiteUrl();
  const evolveLogoUrl = `${siteUrl}/logo_bianco.png`;
  const bccLogoUrl = `${siteUrl}/chiedilo-all-ia/logo-bcc-no-bg.png`;

  return `<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Chiedilo all'IA</title>
</head>
<body style="margin:0; padding:0; background:#f4f7f8; font-family:Arial, Helvetica, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f7f8; padding:24px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width:640px; margin:0 auto; background:#ffffff; border-radius:20px; overflow:hidden; border:1px solid #e6ecef;">

          <!-- Header loghi -->
          <tr>
            <td style="padding:24px 28px; background:#071b34;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="left">
                    <img src="${evolveLogoUrl}" alt="Evolve" width="120" style="display:block; max-width:120px; height:auto;" />
                  </td>
                  <td align="right">
                    <img src="${bccLogoUrl}" alt="BCC Paliano" width="150" style="display:block; max-width:150px; height:auto;" />
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Hero -->
          <tr>
            <td style="padding:32px 28px 20px;">
              <p style="margin:0 0 10px; color:#16877f; font-size:13px; font-weight:700; letter-spacing:.08em; text-transform:uppercase;">
                26 giugno 2026 \u00b7 Paliano
              </p>
              <h1 style="margin:0; color:#081b33; font-size:30px; line-height:1.15;">
                Ti aspettiamo a \u201cChiedilo all\u2019IA\u201d
              </h1>
              <p style="margin:18px 0 0; color:#415466; font-size:16px; line-height:1.65;">
                Un incontro pratico per capire come dialogare con l\u2019intelligenza artificiale in modo pi\u00f9 chiaro, utile e consapevole.
              </p>
            </td>
          </tr>

          <!-- Info card -->
          <tr>
            <td style="padding:0 28px 24px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f6faf9; border:1px solid #dfeceb; border-radius:16px; padding:20px;">
                <tr>
                  <td style="padding:20px;">
                    <p style="margin:0 0 10px; color:#081b33; font-size:16px; line-height:1.5;">
                      <strong>Quando:</strong> venerd\u00ec 26 giugno 2026, accoglienza dalle 17:00
                    </p>
                    <p style="margin:0 0 10px; color:#081b33; font-size:16px; line-height:1.5;">
                      <strong>Dove:</strong> Piazza Marcantonio Colonna, Paliano (FR)
                    </p>
                    <p style="margin:0; color:#081b33; font-size:16px; line-height:1.5;">
                      <strong>Finale:</strong> momento di confronto informale con apericena
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Welcome bag -->
          <tr>
            <td style="padding:0 28px 24px;">
              <p style="margin:0; color:#415466; font-size:16px; line-height:1.65;">
                All\u2019arrivo sar\u00e0 prevista una <strong>welcome bag</strong> per i partecipanti. Poi entreremo nel vivo dell\u2019evento con esempi concreti, casi d\u2019uso, demo live, rischi, governance e spazio domande.
              </p>
            </td>
          </tr>

          <!-- CTA Maps -->
          <tr>
            <td style="padding:0 28px 28px;">
              <a href="${GOOGLE_MAPS_URL}" style="display:inline-block; background:#16877f; color:#ffffff; text-decoration:none; font-weight:700; padding:14px 20px; border-radius:999px; font-size:15px;">
                Apri su Google Maps
              </a>
              <p style="margin:14px 0 0; color:#708090; font-size:13px; line-height:1.5;">
                Se il pulsante non dovesse funzionare, copia e incolla il link Maps nel browser.
              </p>
            </td>
          </tr>

          <!-- Program summary -->
          <tr>
            <td style="padding:0 28px 28px;">
              <h2 style="margin:0 0 12px; color:#081b33; font-size:20px;">
                Di cosa parleremo
              </h2>
              <ul style="margin:0; padding-left:20px; color:#415466; font-size:15px; line-height:1.7;">
                <li>Da domanda vaga a prompt efficace.</li>
                <li>Prompt utili per lavoro, impresa e attivit\u00e0 quotidiane.</li>
                <li>Privacy, bias, affidabilit\u00e0, regole minime e controllo umano.</li>
                <li>Primi passi concreti e spazio domande.</li>
              </ul>
            </td>
          </tr>

          <!-- Speakers -->
          <tr>
            <td style="padding:0 28px 28px;">
              <h2 style="margin:0 0 12px; color:#081b33; font-size:20px;">
                Chi guider\u00e0 l\u2019incontro
              </h2>
              <ul style="margin:0; padding-left:20px; color:#415466; font-size:15px; line-height:1.8;">
                <li><strong>Luca De Angelis</strong> \u2014 presentatore, divulgatore IA</li>
                <li><strong>Luca Marinelli</strong> \u2014 relatore, sviluppatore AI</li>
                <li><strong>Emanuele Ienna</strong> \u2014 relatore, ingegnere AI</li>
                <li><strong>Gian Marco Marinelli</strong> \u2014 relatore, consulente AI</li>
              </ul>
            </td>
          </tr>

          <!-- Special speakers -->
          <tr>
            <td style="padding:0 28px 28px;">
              <h2 style="margin:0 0 12px; color:#081b33; font-size:20px;">
                Speaker di eccezione
              </h2>
              <p style="margin:0; color:#415466; font-size:15px; line-height:1.7;">
                <strong>Francesca Calamari</strong> \u2014 assessore turismo, politiche giovanili e pari opportunit\u00e0 del comune di Paliano<br />
                <strong>Roberto Romani</strong> \u2014 responsabile sviluppo e marketing BCC Paliano
              </p>
            </td>
          </tr>

          <!-- Attachment note -->
          <tr>
            <td style="padding:0 28px 28px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#fff6e6; border:1px solid #f0d49a; border-radius:16px; padding:18px;">
                <tr>
                  <td style="padding:18px;">
                    <p style="margin:0; color:#081b33; font-size:15px; line-height:1.6;">
                      In allegato trovi il <strong>cronoprogramma completo dell\u2019evento</strong>, con orari e momenti principali della giornata.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer contacts -->
          <tr>
            <td style="padding:24px 28px; background:#f6faf9; border-top:1px solid #e6ecef;">
              <p style="margin:0 0 8px; color:#081b33; font-size:15px; font-weight:700;">
                Per ulteriori informazioni
              </p>
              <p style="margin:0; color:#415466; font-size:14px; line-height:1.7;">
                Email: <a href="mailto:infoevolvecompany@gmail.com" style="color:#16877f;">infoevolvecompany@gmail.com</a><br />
                Sito: <a href="https://evolvecompany.tech/chiedilo-all-ia" style="color:#16877f;">evolvecompany.tech/chiedilo-all-ia</a>
              </p>
              <p style="margin:20px 0 0; color:#415466; font-size:15px; line-height:1.7;">
                Ti aspettiamo a Paliano per un pomeriggio di confronto, domande e sperimentazione concreta sull\u2019IA.
              </p>
              <p style="margin:18px 0 0; color:#081b33; font-size:15px; font-weight:700;">
                Il team Evolve
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
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

    const emailPayload: {
      from: string;
      to: string;
      subject: string;
      text: string;
      html: string;
      attachments?: Array<{ filename: string; content: Buffer }>;
    } = {
      from,
      to: input.email,
      subject: EVENT_REGISTRATION_SUBJECT,
      text: buildText(input),
      html: buildHtml(input),
    };

    if (input.attachmentBuffer) {
      emailPayload.attachments = [
        {
          filename: "cronoprogramma-evento-chiedilo-all-ia-paliano.pdf",
          content: input.attachmentBuffer,
        },
      ];
    }

    const result = await resend.emails.send(emailPayload);

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
