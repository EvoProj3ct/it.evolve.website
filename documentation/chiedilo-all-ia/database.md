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
