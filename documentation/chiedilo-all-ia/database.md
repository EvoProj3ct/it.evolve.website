# Database Chiedilo all'IA

Env richiesta: `MONGODB_URI`. L'URI deve includere il nome database.

## `consultation_requests`

Usata da `/rimani-aggiornato` tramite `/api/consultation-requests`.

Campi principali:

- `eventId` (stringa generica, default `"evolve-generale"`)
- `nome`, `cognome`, `email`, `emailLower`, `telefono`
- `profiloProfessionale`, `interesseEventiFormativi`, `usoIaQuotidiano`
- `contactReason`
- `sourcePage: "rimani-aggiornato"`
- `sourceContext: "evolve-rimani-aggiornato"`
- `consents`
- `security.ipHash`, `security.userAgent`
- timestamp `createdAt`, `updatedAt`

Deduplica mantenuta su `eventId + emailLower` per evitare richieste duplicate inutili sullo stesso evento.

## `event_registrations`

Usata da `/chiedilo-all-ia/registrazione/[registrationToken]` tramite `/api/event-registrations`.

Campi principali:

- `eventId`
- `venue`
- `nome`, `cognome`, `email`, `emailLower`
- `profiloProfessionale`, `additionalGuests`
- `consents`
- `security.ipHash`, `security.userAgent`, `security.registrationTokenHash`
- `confirmationEmail`
- timestamp `createdAt`, `updatedAt`

Indici consigliati:

- unique compound su `{ eventId: 1, emailLower: 1 }` per entrambe le collection.
- indice su `createdAt` per consultazione operativa.

## Esportazione dati

Uno script CLI permette di esportare le registrazioni senza esporre API pubbliche:

```bash
# Lista partecipanti (nome, cognome, email)
node --env-file=.env.local scripts/event-registrations-export.mjs list

# Solo email (utile per marketing)
node --env-file=.env.local scripts/event-registrations-export.mjs emails

# Formato CSV (nome,cognome,email)
node --env-file=.env.local scripts/event-registrations-export.mjs csv

# Tutti i formati in sequenza
node --env-file=.env.local scripts/event-registrations-export.mjs
```

Lo script si connette a MongoDB usando `MONGODB_URI` dall'env, filtra per `eventId: "chiedilo-all-ia-bcc-paliano"` e ordina per `createdAt` ascendente.
