# Chiedilo all’IA - Webapp evento BCC/Evolve

deploy 1 08-06-2026

Webapp Next.js per la landing dell’evento “Chiedilo all’IA”, promosso da BCC e realizzato da Evolve.

## Obiettivo

Raccogliere contatti, aggiornamenti e consensi per l’iniziativa, presentando programma, pubblico, valore dell’incontro, welcome bag e kit pratico post-evento. La registrazione ufficiale all’evento usa una pagina riservata non linkata nella webapp pubblica.

## Stack

- Next.js
- React
- TypeScript
- Tailwind CSS
- MongoDB
- Zod

## Avvio locale

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Variabili ambiente

```env
MONGODB_URI=
PRIVATE_EVENT_REGISTRATION_TOKEN=
```

`MONGODB_URI` deve includere esplicitamente il nome del database.

`PRIVATE_EVENT_REGISTRATION_TOKEN` protegge la pagina riservata `/registrazione/<token>` con un token lungo configurato in ambiente. Generare un valore con:

```bash
openssl rand -hex 32
```

Non committare token reali nel codice o nella documentazione.

## Event ID

```txt
chiedilo-all-ia
chiedilo-all-ia-bcc-paliano
```

## Pagine principali

- `/` landing evento
- `/partecipa` aggiornamenti e materiali
- `/registrazione/<token>` registrazione evento riservata e non linkata
- `/thank-you`
- `/privacy`
- `/cookie-policy`
- `/sicurezza`

## Collection MongoDB

- `consultation_requests`: contatti pubblici da `/partecipa`.
- `event_registrations`: registrazioni evento dalla pagina riservata.

## Note deploy

Prima del deploy verificare:

- variabile `MONGODB_URI`;
- variabile `PRIVATE_EVENT_REGISTRATION_TOKEN`;
- contatti privacy, incluso l'indirizzo temporaneo `info@evolvecompany.tech`;
- eventuale autorizzazione all’uso di riferimenti BCC;
- testi definitivi di data, luogo e modalità di iscrizione se disponibili.
