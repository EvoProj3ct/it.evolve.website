# Email Conferma Registrazione

## Provider

La conferma usa Resend tramite package `resend`.

Env usate:

- `RESEND_API_KEY`
- `SENDING_EMAIL_FROM`

Non sono introdotte env alternative come `EMAIL_FROM`, `EVENT_CONFIRMATION_FROM` o `EMAIL_PROVIDER`.

## Template

Oggetto: `Iscrizione confermata a Chiedilo all'IA`.

Fallback text/plain:

```txt
Ciao {nome},

la tua iscrizione all'evento "Chiedilo all'IA" è stata registrata correttamente.

Grazie,
Team Evolve
```

E' presente anche una versione HTML semplice e accessibile.

## Errori

Il salvataggio MongoDB e' la fonte primaria della registrazione. Se Resend fallisce dopo l'insert:

- la registrazione resta valida;
- il documento non viene cancellato;
- l'utente riceve comunque successo;
- l'esito viene salvato nel campo `confirmationEmail`.

Formato:

```ts
confirmationEmail: {
  status: "sent" | "failed";
  sentAt: Date | null;
  error: string | null;
}
```

Gli errori salvati sono sintetici e non devono contenere API key o token.
