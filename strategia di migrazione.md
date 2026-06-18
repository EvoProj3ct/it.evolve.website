# Strategia di migrazione

## Obiettivo

Portare il mini-progetto `smart.chiedilo-ia-main` dentro il sito principale senza mescolare layout, navbar, footer, stili globali e logiche del sito corporate.

Le nuove destinazioni richieste sono:

- `https://evolvecompany.tech/chiedilo-all-ia`
- `https://evolvecompany.tech/consulenza`

Il backend/API del mini-progetto va migrato integralmente nel progetto principale, aggiungendo cio che manca.

## Stato attuale del progetto principale

Il sito principale e' una app Next in `src/app`.

Oggi `src/app/layout.tsx` applica a tutte le pagine:

- `Navbar`
- `IntroLoader`
- `SiteFooter`
- `globals.css` corporate
- font Montserrat e Inter

Questa e' la ragione per cui una pagina copiata semplicemente in `src/app/chiedilo-all-ia/page.tsx` erediterebbe automaticamente navbar, loader e footer corporate. Per ottenere pagine davvero indipendenti serve separare il layout globale dal layout del sito principale.

Nel progetto principale esistono gia alcune API:

- `src/app/api/support-chat/...`
- `src/app/api/leaderboard/route.ts`
- `src/app/api/score/route.ts`

Queste non vanno toccate, salvo verifica build finale.

## Stato attuale di `smart.chiedilo-ia-main`

`smart.chiedilo-ia-main` e' un secondo progetto Next completo. Contiene:

- pagine in `smart.chiedilo-ia-main/app`
- componenti in `smart.chiedilo-ia-main/app/components`
- backend in `smart.chiedilo-ia-main/app/api`
- helper server in `smart.chiedilo-ia-main/lib`
- asset pubblici in `smart.chiedilo-ia-main/public`
- dipendenze specifiche in `smart.chiedilo-ia-main/package.json`

Le pagine principali trovate sono:

- `app/page.tsx`: landing evento "Chiedilo all'IA"
- `app/partecipa/page.tsx`: form pubblico di interesse e consensi
- `app/registrazione/[registrationToken]/page.tsx`: registrazione privata con token
- `app/thank-you/page.tsx`: conferma iscrizione
- `app/privacy/page.tsx`
- `app/sicurezza/page.tsx`
- `app/cookie-policy/page.tsx`
- `app/consulenza/page.tsx`: attualmente fa redirect a `/partecipa`

Nota importante: il vero `contact-form` citato nella richiesta e' il componente `app/components/contact-form.tsx`. Non e' usato dalla pagina `app/consulenza/page.tsx`, che oggi reindirizza a `/partecipa`. Quindi per `/consulenza` bisogna decidere se usare:

- il componente `ContactForm`, che apre un `mailto:` e non salva dati;
- oppure `EventInterestForm`, che salva sul backend MongoDB tramite `/api/consultation-requests`.

Dato che la richiesta parla esplicitamente di `contact-form`, la migrazione piu letterale e' creare `/consulenza` con `ContactForm`.

## Architettura consigliata

Usare i route group di Next per separare il sito corporate dalle pagine standalone. I route group non cambiano gli URL pubblici.

Struttura target consigliata:

```txt
src/app/
  layout.tsx
  globals.css

  (site)/
    layout.tsx
    page.tsx
    about/page.tsx
    contact/page.tsx
    portfolio/page.tsx

  (standalone)/
    layout.tsx
    chiedilo-all-ia/page.tsx
    consulenza/page.tsx
    chiedilo-all-ia/partecipa/page.tsx
    chiedilo-all-ia/registrazione/[registrationToken]/page.tsx
    chiedilo-all-ia/thank-you/page.tsx
    chiedilo-all-ia/privacy/page.tsx
    chiedilo-all-ia/sicurezza/page.tsx
    chiedilo-all-ia/cookie-policy/page.tsx

  api/
    consultation-requests/route.ts
    event-registrations/route.ts
    health/db/route.ts
    ...

src/components/
  chiedilo/
    contact-form.tsx
    cookie-consent.tsx
    event-interest-form.tsx
    private-event-registration-form.tsx
    site-footer.tsx
    toast-stack.tsx

src/lib/
  chiedilo/
    mongodb.ts
    consultation-schema.ts
    event-registration-schema.ts

public/
  chiedilo-all-ia/
    logo-bcc.png
    logo-bcc-no-bg.png
    logo_nero.png
    logo_bianco.png
```

Il file `src/app/layout.tsx` dovrebbe diventare il layout minimo con solo `html`, `body`, font globali e `{children}`.

Il layout corporate attuale va spostato in `src/app/(site)/layout.tsx`, dove continuera a renderizzare `Navbar`, `IntroLoader` e `SiteFooter`.

Il layout standalone in `src/app/(standalone)/layout.tsx` non deve renderizzare la navbar o il footer corporate. Puo invece contenere, se desiderato, gli elementi del mini-progetto: cookie consent e footer evento.

## Mappatura URL

Mappatura consigliata:

```txt
/                         -> src/app/(site)/page.tsx
/about                    -> src/app/(site)/about/page.tsx
/contact                  -> src/app/(site)/contact/page.tsx
/portfolio                -> src/app/(site)/portfolio/page.tsx

/chiedilo-all-ia          -> src/app/(standalone)/chiedilo-all-ia/page.tsx
/consulenza               -> src/app/(standalone)/consulenza/page.tsx
```

Per le pagine accessorie del mini-progetto, consiglio di metterle sotto `/chiedilo-all-ia/...` per non occupare rotte generiche del sito corporate:

```txt
/chiedilo-all-ia/partecipa
/chiedilo-all-ia/registrazione/[registrationToken]
/chiedilo-all-ia/thank-you
/chiedilo-all-ia/privacy
/chiedilo-all-ia/sicurezza
/chiedilo-all-ia/cookie-policy
```

Di conseguenza, i link interni copiati dal mini-progetto vanno aggiornati:

```txt
/partecipa     -> /chiedilo-all-ia/partecipa
/privacy       -> /chiedilo-all-ia/privacy
/sicurezza     -> /chiedilo-all-ia/sicurezza
/cookie-policy -> /chiedilo-all-ia/cookie-policy
/thank-you     -> /chiedilo-all-ia/thank-you
/              -> /chiedilo-all-ia, quando il link e' interno al mini-progetto
```

## Backend/API da migrare

Copiando integralmente il backend del mini-progetto vanno aggiunte queste route:

```txt
src/app/api/consultation-requests/route.ts
src/app/api/event-registrations/route.ts
src/app/api/health/db/route.ts
```

Vanno copiati anche gli helper:

```txt
src/lib/chiedilo/mongodb.ts
src/lib/chiedilo/consultation-schema.ts
src/lib/chiedilo/event-registration-schema.ts
```

Gli import delle API vanno aggiornati, per esempio:

```ts
import { getDatabase } from "@/lib/chiedilo/mongodb";
import { consultationRequestSchema } from "@/lib/chiedilo/consultation-schema";
```

Consiglio inoltre di dichiarare esplicitamente il runtime Node nelle route MongoDB:

```ts
export const runtime = "nodejs";
```

Il backend usa:

- MongoDB
- Zod
- hash IP con `crypto`
- honeypot anti-spam tramite campo `website`
- controllo duplicati per email/evento
- token privato per la registrazione evento

## Dipendenze da aggiungere

Nel progetto principale mancano queste dipendenze del mini-progetto:

```txt
lucide-react
mongodb
zod
```

Non conviene aggiornare automaticamente `next`, `react` e `react-dom` solo per allinearsi al mini-progetto: il sito principale e' gia su Next 16 e React 19. Meglio aggiungere solo le librerie mancanti e verificare la build.

## Variabili ambiente

Nel progetto principale sono gia presenti variabili per Upstash KV e Groq. Per questa migrazione servono anche:

```txt
MONGODB_URI
PRIVATE_EVENT_REGISTRATION_TOKEN
```

`MONGODB_URI` deve includere esplicitamente il nome del database, ad esempio:

```txt
mongodb+srv://utente:password@cluster.mongodb.net/nome_database
```

`PRIVATE_EVENT_REGISTRATION_TOKEN` serve sia per la pagina privata `/chiedilo-all-ia/registrazione/[registrationToken]`, sia per l'API `/api/event-registrations`.

## Database

Le collection usate sono:

```txt
consultation_requests
event_registrations
```

Indici consigliati:

```js
db.consultation_requests.createIndex(
  { eventId: 1, emailLower: 1 },
  { unique: true }
);

db.event_registrations.createIndex(
  { eventId: 1, emailLower: 1 },
  { unique: true }
);
```

Indici utili opzionali:

```js
db.consultation_requests.createIndex({ createdAt: -1 });
db.event_registrations.createIndex({ createdAt: -1 });
```

## Asset

Gli asset del mini-progetto non vanno copiati alla radice di `public`, per evitare collisioni future con il sito corporate.

Consiglio:

```txt
public/chiedilo-all-ia/logo-bcc.png
public/chiedilo-all-ia/logo-bcc-no-bg.png
public/chiedilo-all-ia/logo_nero.png
public/chiedilo-all-ia/logo_bianco.png
```

Poi aggiornare i riferimenti in `Image`:

```txt
/logo-bcc.png       -> /chiedilo-all-ia/logo-bcc.png
/logo-bcc-no-bg.png -> /chiedilo-all-ia/logo-bcc-no-bg.png
/logo_nero.png      -> /chiedilo-all-ia/logo_nero.png
/logo_bianco.png    -> /chiedilo-all-ia/logo_bianco.png
```

## Stili e isolamento

Non bisogna copiare `smart.chiedilo-ia-main/app/globals.css` cosi com'e' dentro il progetto principale, perche contiene regole su `body`, `:root` e tema globale. Questo rischierebbe di cambiare anche il sito corporate.

Strategia consigliata:

- mantenere `src/app/globals.css` come CSS globale del progetto;
- estrarre dal mini-progetto solo le classi necessarie ai form: `.input`, `.form-control`, `.form-field-label`;
- meglio ancora: rinominarle con prefisso, ad esempio `.chiedilo-form-control`, `.chiedilo-form-field-label`;
- aggiornare i componenti copiati per usare le classi prefissate;
- lasciare le utility Tailwind direttamente nei componenti.

Questo mantiene le pagine standalone isolate senza introdurre regole generiche che possano cambiare il resto del sito.

## Piano operativo

1. Creare route group `(site)` e `(standalone)`.
2. Rendere `src/app/layout.tsx` minimale.
3. Spostare le pagine corporate esistenti dentro `(site)` mantenendo gli stessi URL.
4. Copiare la landing evento in `/chiedilo-all-ia`.
5. Creare `/consulenza` usando `ContactForm`, salvo decisione diversa sul form DB-backed.
6. Copiare i componenti del mini-progetto in `src/components/chiedilo`.
7. Copiare gli helper backend in `src/lib/chiedilo`.
8. Copiare le API in `src/app/api`.
9. Aggiungere `lucide-react`, `mongodb`, `zod`.
10. Copiare gli asset sotto `public/chiedilo-all-ia`.
11. Aggiornare import, link interni e path immagini.
12. Aggiungere le variabili ambiente su ambiente locale e produzione.
13. Creare gli indici MongoDB.
14. Eseguire build e smoke test.

## Checklist di verifica

Rotte corporate da ricontrollare:

```txt
/
/about
/contact
/portfolio
```

Rotte standalone da ricontrollare:

```txt
/chiedilo-all-ia
/consulenza
/chiedilo-all-ia/partecipa
/chiedilo-all-ia/privacy
/chiedilo-all-ia/sicurezza
/chiedilo-all-ia/cookie-policy
/chiedilo-all-ia/registrazione/[token]
/chiedilo-all-ia/thank-you
```

API da ricontrollare:

```txt
GET  /api/health/db
POST /api/consultation-requests
POST /api/event-registrations
```

Comandi:

```bash
npm install
npm run build
npm run dev
```

Test manuali:

- il sito corporate continua ad avere navbar, loader e footer;
- `/chiedilo-all-ia` non mostra navbar, loader e footer corporate;
- `/consulenza` non mostra navbar, loader e footer corporate;
- le immagini BCC/Evolve si caricano;
- i link interni del mini-progetto non puntano piu a rotte generiche sbagliate;
- il form pubblico valida i campi obbligatori;
- il form pubblico salva su MongoDB se si usa `EventInterestForm`;
- il form `ContactForm` apre il client email se si usa la versione mailto;
- la registrazione privata torna 404 con token errato;
- la registrazione privata salva su MongoDB con token corretto;
- la duplicazione email/evento torna 409;
- `/api/health/db` torna `ok: true` quando MongoDB e' configurato.

## Rischi principali

- La migrazione e' semplice a livello di codice, ma il refactor del layout globale va fatto con attenzione per non alterare le pagine corporate.
- Il mini-progetto usa classi CSS generiche come `.form-control`; copiarle senza prefisso puo creare conflitti.
- Le pagine del mini-progetto usano link assoluti come `/privacy` e `/partecipa`; se non vengono aggiornati, portano fuori dal contesto standalone.
- Il backend non funzionera senza `MONGODB_URI` e `PRIVATE_EVENT_REGISTRATION_TOKEN`.
- `app/consulenza/page.tsx` nel mini-progetto non contiene il contact form: e' un redirect. La pagina `/consulenza` va quindi costruita esplicitamente usando `ContactForm` oppure sostituita con il form backend-backed.

## Conclusione

Si, dovrebbe essere una migrazione abbastanza semplice. La scelta giusta e' non "fondere" i due progetti, ma incapsulare il mini-progetto nel sito principale con route group, asset namespaced, componenti dedicati e backend copiato in modo ordinato.

Il lavoro delicato non e' copiare i file: e' evitare che layout globale, CSS globale e link assoluti del mini-progetto contaminino il sito corporate.

## Esito migrazione

Migrazione eseguita.

Implementato:

- layout corporate spostato nel route group `src/app/(site)`;
- layout standalone creato in `src/app/(standalone)` senza navbar, loader e footer corporate;
- pagina evento disponibile su `/chiedilo-all-ia`;
- pagina consulenza disponibile su `/consulenza`;
- `/consulenza` usa `EventInterestForm`, quindi salva su MongoDB tramite `/api/consultation-requests`;
- pagine accessorie evento disponibili sotto `/chiedilo-all-ia/...`;
- componenti evento migrati in `src/components/chiedilo`;
- helper MongoDB/Zod migrati in `src/lib/chiedilo`;
- API migrate in `src/app/api/consultation-requests`, `src/app/api/event-registrations`, `src/app/api/health/db`;
- asset evento copiati in `public/chiedilo-all-ia`;
- dipendenze aggiunte: `lucide-react`, `mongodb`, `zod`;
- cartella sorgente `smart.chiedilo-ia-main` esclusa da `tsconfig.json`, cosi puo restare temporaneamente nel repository senza rompere la build.

Verifica:

- build Next completata correttamente con Node compatibile;
- `http://127.0.0.1:3000/chiedilo-all-ia` risponde `200`;
- `http://127.0.0.1:3000/consulenza` risponde `200`.

Da configurare prima dell'uso reale del backend:

```txt
MONGODB_URI
PRIVATE_EVENT_REGISTRATION_TOKEN
```
