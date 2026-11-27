export const VERIFICATION_MAIL_TEMPLATE = "evolve-shop-verify-v1";

function escapeAttribute(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

export function renderVerificationMail(origin, token) {
  const verification = new URL("/account/verify-email", origin);
  verification.hash = new URLSearchParams({ token }).toString();
  const cart = new URL("/account/login", origin);
  cart.searchParams.set("next", "/carrello");
  const logo = new URL("/logoEvolve.png", origin);

  const title = "Benvenuto in Evolve Shop";
  const welcome = "Ciao, grazie per esserti registrato!";
  const instruction = "Per attivare il tuo account, apri il link qui sotto e inserisci la password che hai scelto durante la registrazione.";
  const cartTitle = "Completa il tuo ordine";
  const cartInstruction = "Una volta confermata l’email, accedi per rivedere gli articoli, scegliere la consegna e completare l’acquisto.";
  const guestNote = "Se hai aggiunto prodotti da ospite, torna alla scheda dello shop in cui hai iniziato per ritrovare il carrello.";
  const securityNote = "Se non hai chiesto tu di creare un account, puoi ignorare questa email.";

  return {
    subject: `${title}. Conferma la tua email`,
    senderName: "Evolve Shop",
    text: [
      title,
      welcome,
      instruction,
      `Conferma la tua email\n${verification.href}`,
      cartTitle,
      cartInstruction,
      `Accedi e vai al carrello\n${cart.href}`,
      guestNote,
      "A presto,\nIl team Evolve Shop",
      securityNote,
    ].join("\n\n"),
    html: `<!doctype html>
<html lang="it">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background-color:#edf3ea;color:#193024;font-family:Arial,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#edf3ea;">
    <tr><td align="center" style="padding:28px 14px;">
      <!--[if mso]><table role="presentation" width="560" cellspacing="0" cellpadding="0"><tr><td><![endif]-->
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background-color:#ffffff;border:1px solid #dbe7d5;border-top:5px solid #56963c;border-radius:14px;">
        <tr><td style="padding:28px 30px 0;">
          <img src="${escapeAttribute(logo.href)}" alt="Evolve" width="62" height="51" style="display:block;width:62px;height:51px;border:0;color:#193024;">
          <h1 style="margin:22px 0 14px;font-size:32px;line-height:1.16;color:#14261b;">${title}</h1>
          <p style="margin:0 0 8px;font-size:16px;line-height:1.55;">${welcome}</p>
          <p style="margin:0 0 22px;font-size:16px;line-height:1.55;">${instruction}</p>
          <table role="presentation" cellspacing="0" cellpadding="0"><tr>
            <td bgcolor="#244e32" style="background-color:#244e32;border-radius:8px;mso-padding-alt:14px 21px;">
              <a href="${escapeAttribute(verification.href)}" style="display:inline-block;padding:14px 21px;color:#ffffff;font-size:16px;line-height:20px;font-weight:bold;text-decoration:none;border-radius:8px;mso-padding-alt:0;">Conferma la tua email</a>
            </td>
          </tr></table>
        </td></tr>
        <tr><td style="padding:25px 30px 0;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#edf5e9;border-radius:10px;">
            <tr><td style="padding:18px 20px;color:#193024;">
              <h2 style="margin:0 0 7px;font-size:19px;line-height:1.3;">${cartTitle}</h2>
              <p style="margin:0 0 10px;font-size:15px;line-height:1.55;">${cartInstruction}</p>
              <p style="margin:0;font-size:15px;line-height:1.55;">${guestNote}</p>
              <p style="margin:12px 0 0;font-size:15px;line-height:1.55;"><a href="${escapeAttribute(cart.href)}" style="color:#244e32;font-weight:bold;text-decoration:underline;">Accedi e vai al carrello</a></p>
            </td></tr>
          </table>
        </td></tr>
        <tr><td style="padding:21px 30px 28px;">
          <p style="margin:0 0 17px;font-size:16px;line-height:1.55;">A presto,<br><strong>Il team Evolve Shop</strong></p>
          <p style="margin:0;padding-top:15px;border-top:1px solid #dbe7d5;color:#4e6053;font-size:13px;line-height:1.5;">${securityNote}</p>
        </td></tr>
      </table>
      <!--[if mso]></td></tr></table><![endif]-->
    </td></tr>
  </table>
</body>
</html>`,
  };
}
