# Registrazione Evento Privata

La registrazione evento vive in `/chiedilo-all-ia/registrazione/[registrationToken]` ed e' pensata per canali privati, non linkati dalla landing pubblica.

## Token

- Env usata: `PRIVATE_EVENT_REGISTRATION_TOKEN`.
- La pagina confronta il token della route con quello in env e restituisce `notFound()` se non valido.
- L'API `/api/event-registrations` ripete la validazione server-side.
- Il token non viene salvato in chiaro; viene salvato solo un hash nei metadati di sicurezza.

## Form

Campi principali:

- nome
- cognome
- email
- sede evento
- profilo professionale
- persone aggiuntive
- consensi privacy e sicurezza
- honeypot `website`

## Persistenza

- Collection: `event_registrations`.
- Deduplica: `eventId + emailLower`.
- Redirect success: `/chiedilo-all-ia/registrazione/thank-you`.
- Dopo il salvataggio viene inviata una email di conferma tramite Resend.
