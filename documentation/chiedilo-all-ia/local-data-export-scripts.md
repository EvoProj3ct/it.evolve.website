# Script locali export dati

Questi script generano file JSON locali per conteggi evento e liste email operative. Sono pensati per uso da terminale/WebStorm, non creano API e non espongono dati via endpoint.

## Prerequisito

Nel file `.env.local` deve essere presente `MONGODB_URI` con il nome database incluso.

Esecuzione diretta:

```bash
node --env-file=.env.local scripts/script-how-many-subscribers.mjs --venue=paliano
```

## Script disponibili

- `scripts/script-how-many-subscribers.mjs`: conta iscritti principali e ospiti minimi da `event_registrations`.
- `scripts/script-email-subscribed.mjs`: esporta email iscritti evento da `event_registrations`.
- `scripts/script-email-send-opensource-content.mjs`: esporta email per contenuti open source/post evento da `consultation_requests`.
- `scripts/script-email-send-marketing-content.mjs`: esporta email per contenuti marketing/prodotti/servizi da `consultation_requests`.

Per gli script evento `--venue` e obbligatorio. Venue ammesse: `paliano`, `serrone`, `sora`, `colleferro`, `valmontone`.

`--eventId` e opzionale. Per gli script evento il default e `chiedilo-all-ia-bcc-paliano`.

Per `script-email-send-opensource-content.mjs` il default e `evolve-generale` e il filtro `eventId` viene sempre applicato. Lo script non usa filtri `venue`.

Per `script-email-send-marketing-content.mjs`, se `--eventId` viene omesso, l'export vale su tutta la collection con i filtri consenso marketing previsti.

## Esempi diretti

```bash
node --env-file=.env.local scripts/script-how-many-subscribers.mjs --venue=paliano
node --env-file=.env.local scripts/script-email-subscribed.mjs --venue=paliano
node --env-file=.env.local scripts/script-email-send-opensource-content.mjs
node --env-file=.env.local scripts/script-email-send-marketing-content.mjs
node --env-file=.env.local scripts/script-email-send-opensource-content.mjs --eventId=evolve-generale
```

## Esempi npm

```bash
npm run report:event:subscribers -- --venue=paliano
npm run report:event:emails -- --venue=paliano
npm run report:opensource:emails
npm run report:marketing:emails
npm run report:opensource:emails -- --eventId=evolve-generale
```

## Output

I file vengono generati in `script-output/`, creata automaticamente se non esiste.

- `how-many-subscribers-<eventId>-<venue>.json`
- `email-subscribed-<eventId>-<venue>.json`
- `email-send-opensource-content-<eventId>.json`
- `email-send-marketing-content.json`
- `email-send-marketing-content-<eventId>.json`

Le email sono deduplicate case-insensitive. Lo script conteggio considera `additionalGuests='3-plus'` come 3 persone aggiuntive minime.

`script-output/` contiene dati personali, e esclusa da Git e non deve essere versionata.
