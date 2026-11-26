# Integrazione sito → Atlas

Aggiornata il 26 novembre 2026. Integrazione costruita sulla consegna del 5 novembre 2026 in `docs/ecommerce-handoff-sito-2026-11-05`. La fonte principale è `docs/ecommerce-handoff-agente-sito.md` nell’archivio; sono stati consultati i contratti runtime e i servizi di riferimento per distinguere gli esempi iniziali dalle API effettive. Nessuna connessione ai deployment, invio email, operazione Mongo, ordine o pagamento è stato eseguito dall’agente.

## Struttura realizzata

Il sito rimane Next App Router. `packages/ecommerce-server` è la copia del pacchetto privato consegnato, dichiarata come dipendenza locale; `reference/atlas` resta esclusivamente documentazione e non viene importato nel runtime. Dipendenze previste dall’handoff: `@vercel/oidc`, Mongoose e `server-only`. I lockfile ora fissano Next.js 15.5.29 su Atlas e 16.4.5 sul sito per le correzioni di novembre 2026. Atlas usa Sharp per normalizzare i loghi. [Avviso Next.js](https://nextjs.org/blog/november-2026-security-release).

I moduli in `src/server` iniziano con `import "server-only"`. Il pacchetto gestisce autenticazione, connessione identità, catalogo, collegamento Cliente e tracking. `storefront-commerce.ts` aggiunge il trasporto personale mancante: sole operazioni nominate, Request originale, attestazione nuova per ogni chiamata, OIDC ottenuto dal runtime Vercel, origine fissa e header in allowlist. Nessun inoltro di cookie, Origin, CSRF o Authorization browser ad Atlas.

### Pagine browser

| Percorso | Comportamento |
| --- | --- |
| `/shop/e-disk`, `/shop/e-linker`, `/shop/e-led` | Configuratori acquistabili con gli articoli collegati e pubblicati in Atlas |
| `/negozio` | Catalogo pubblicato, paginato, letto da Atlas |
| `/negozio/[slug]` | Scheda pubblicata e accesso al configuratore associato. Gli altri articoli fisici supportano una personalizzazione semplice |
| `/account` | Profilo effettivo, collegamento commerciale e ordini propri |
| `/account/register`, `/account/login` | Registrazione e accesso con il modulo condiviso |
| `/account/verify-email`, `/account/reset-password`, `/account/confirm-email` | Token dal fragment, rimosso dall’URL prima delle richieste; conferma manuale |
| `/account/forgot-password`, `/account/resend-verification` | Richiesta generica di recupero/reinvio |
| `/account/change-password`, `/account/change-email` | Cambi credenziali con password corrente |
| `/account/logout`, `/account/logout-all` | Conferma esplicita, revoca e pulizia dello stato in memoria |
| `/account/ordini`, `/account/ordini/[id]` | Ordini propri attivi, ricevuti e annullati, statistiche personali, stati, quantità evase e aggiornamenti pubblicati in Atlas |
| `/carrello` | Carrello autorevole, modifiche locali e salvataggio esplicito con revisione |
| `/checkout` | Policy, fatturazione, modalità compatibili, codice sconto, riepilogo e conferma ordine |
| `/shop/profilo`, `/shop/carrello` | Redirect ai nuovi percorsi, per conservare i collegamenti precedenti |

Il gruppo `(shop)` condivide navbar e footer del sito, mantenuto fuori dal contenitore CSS dello shop. Le icone portano a `/account` e `/carrello`; la parola “shop” porta al catalogo reale. Home del sito, file del footer e protocollo BLE/NFC di e-disk non sono stati modificati.

### API del sito

Tutte sotto `/api/ecommerce/v1`, runtime Node e dinamiche:

- `GET /auth/csrf`, `POST /auth/[action]`, `GET/PATCH /me`: adapter del modulo auth.
- `GET/POST /me/customer-link`: stato minimo e risoluzione esplicita del collegamento commerciale.
- `GET /catalog`, `/catalog/[id]`, `/product-pages/[slug]`: adapter catalogo del pacchetto.
- `GET /cart`, `PUT /cart/items`, `GET /checkout-options`.
- `POST /quotes`, `GET /quotes/[id]`, `POST /orders/place`.
- `GET /orders`, `GET /orders/[id]`.
- `POST /orders/[id]/payment-session`, `GET /orders/[id]/payment-status`.
- `GET /orders/[id]/tracking`, `/timeline`, `/deliveries/[deliveryId]`: client tracking condiviso.

Non esistono un proxy universale, route staff o route verso anagrafiche, ricavi, EVENTI o calendario. Le mutazioni commerciali interne restano POST ad Atlas; le letture browser rimangono GET e il salvataggio carrello rimane PUT.

### Worker privati

| Percorso sul sito | Protezione e responsabilità |
| --- | --- |
| `POST /api/internal/auth-mail` | Bearer dedicato, niente Origin; consegna cifrata tramite il worker condiviso |
| `POST /api/internal/customer-identities` | Bearer distinto, niente Origin/cookie; riconciliazione nominativa via OIDC |

Nessuna schedulazione o invocazione automatica creata. Servono invocatori privati compatibili con POST, configurati dall’utente. Il worker email deve essere invocato entro le finestre della coda; la sola risposta 202 di registrazione non prova l’invio di un’email. Webhook, worker finanziario e segreti Stripe rimangono esclusivamente in Atlas. Non viene creato un terzo deployment.

## Contratti e comportamento

`src/lib/ecommerce/contracts.ts` contiene DTO e schemi pubblici in allowlist per cart, policy, quote, ordini e pagamenti. Tiene conto delle differenze fra i tipi di riferimento e le proiezioni runtime: `fulfillmentModes` nelle righe carrello, `productPublicId`/`listingRevision` nelle righe quote e le fasi effettive delle righe di evasione. Catalogo e tracking vengono già validati dai moduli consegnati prima della risposta al browser.

- Body letti in streaming con limite effettivo, anche senza `Content-Length`; 32 KiB per l’adapter commerciale, 1 MiB per la risposta personale. Il modulo auth mantiene il proprio limite di 16 KiB.
- Query e proprietà aggiuntive rifiutate, ID validati prima di costruire il percorso, errori upstream ricondotti a codici e messaggi chiusi. Risposte personali `private, no-store`, nessuna cache persistente o log di dati personali/segreti.
- Cookie e CSRF conservano le impostazioni del pacchetto, senza varianti locali insicure. Ogni mutazione ottiene un CSRF nuovo; la coda client serializza le mutazioni senza conservare l’ultimo DTO personale.
- Password e token rimangono in memoria solo per l’azione. Token email mai in query o storage, password svuotate dopo il submit, nessun login automatico dopo verifica/reset. Attribuzione Have I Been Pwned conservata.
- Profilo, carrello, ordini, quote e tracking vengono rimossi dallo stato visualizzato al cambio sessione/logout, anche tra schede mediante BroadcastChannel. Risposte obsolete vengono annullate o scartate. Nessun dato account in localStorage/sessionStorage.
- Il carrello invia ID, revisione, quantità e riferimenti alle personalizzazioni. Una nuova configurazione per salvataggio contiene i dati del tipo collegato in Atlas. Nessun autosave. Le variazioni di catalogo richiedono riconferma esplicita; `CART_CHANGED` provoca rilettura e messaggio, senza sovrascrittura automatica.
- Prezzi e IVA arrivano da Atlas, in centesimi. La UI usa i totali delle risposte, senza ricostruire importi ufficiali moltiplicando netti unitari arrotondati. L’importo carrello rimane un’anteprima; consegna e totale definitivo arrivano dalla quote.
- Modalità e Paesi derivano dalla policy; fisico/servizio/misto sono distinti. L’indirizzo shipping viene inviato soltanto con la modalità shipping. Nome, tipo e email restano soggetti alla verifica commerciale Atlas.
- Chiavi idempotenti separate per quote, conferma ordine e tentativo pagamento. Una richiesta incerta conserva la chiave e il payload del tentativo logico; niente retry automatici o nuova vendita per superare un timeout. Le chiavi vivono soltanto nella pagina: dopo un reload il recupero passa dagli ordini e dallo stato autorevole.
- La conferma crea l’ordine, non un incasso. Il ritorno Stripe su `/account/ordini/[id]?pagamento=...` non determina lo stato. Redirect soltanto all’origine esatta `https://checkout.stripe.com` e al percorso di una sessione Checkout `/c/pay/cs_…`, preservando il frammento restituito; nessun modulo carte o chiave Stripe sul sito.
- Stato operativo, pagamento ed evasione rimangono separati. Tracking ritirato/non disponibile e 404 rimuovono la vista precedente; cambio versione richiede ripartenza dalla prima pagina. Timeline filtrata e dettaglio usano soltanto API pubblicabili, nessun calendario interno. Giorni senza ora, istanti e finestre restano distinti.
- Aggiornamenti pagamento/tracking manuali, nessun polling aggressivo. Il budget condiviso di 10 mutazioni checkout ogni 15 minuti non è stato modificato. 429 e `Retry-After` bloccano richieste ripetute durante l’attesa.

## Configurazione dell’ambiente

La lista da compilare è `/.env.example`, priva di valori reali. Non sono stati modificati file con segreti. Nessuna env ecommerce è `NEXT_PUBLIC_*`.

| Gruppo sito | Env |
| --- | --- |
| Collegamento Atlas | `ECOMMERCE_ATLAS_ORIGIN`, `ECOMMERCE_INTERNAL_AUDIENCE`, eventuale `ECOMMERCE_ATLAS_PROTECTION_BYPASS` |
| Identità e DB limitato | `ECOMMERCE_SHOP_ID`, `ECOMMERCE_MONGODB_URI`, `ECOMMERCE_MONGODB_DB`, `ECOMMERCE_STOREFRONT_ORIGIN`, `ECOMMERCE_AUTH_HMAC_KEY` |
| Versioni dei testi account | `ECOMMERCE_AUTH_TERMS_VERSION`, `ECOMMERCE_AUTH_PRIVACY_VERSION` |
| Coda e invio email | `ECOMMERCE_AUTH_EMAIL_KEY_ID`, `ECOMMERCE_AUTH_EMAIL_KEYS`, `ECOMMERCE_AUTH_RESEND_API_KEY`, `ECOMMERCE_AUTH_MAIL_FROM`, `ECOMMERCE_AUTH_DELIVERY_SECRET` |
| Worker Clienti | `ECOMMERCE_CUSTOMER_SYNC_SECRET` |
| Percorsi dei testi effettivi | `ECOMMERCE_AUTH_TERMS_PATH`, `ECOMMERCE_AUTH_PRIVACY_PATH`, `ECOMMERCE_CHECKOUT_TERMS_PATH`, `ECOMMERCE_CHECKOUT_TERMS_VERSION` |

Origini HTTPS esatte senza slash finale. Audience uguale all’origine Atlas; origine sito uguale all’issuer delle attestazioni configurato in Atlas. Chiave HMAC di 32 byte in base64url canonico, key ring email e segreti worker nei formati del pacchetto. Le nuove env `*_PATH` sono percorsi interni pubblici, per esempio `/percorso`, senza query o fragment, e non contengono segreti.

Le pagine legali generali già esistenti non vengono automaticamente dichiarate condizioni del negozio. I percorsi devono raggiungere testi effettivi, corrispondenti alle versioni configurate. Senza questi dati la registrazione restituisce 503 e il form resta indisponibile; senza condizioni acquisto pubblicate non si abilita la conferma ordine. Non sono stati inventati termini legali o consensi fittizi per sbloccare le prove.

## Personalizzazioni e sconti

In Atlas, **E-commerce → Personalizzazioni → Tipi di configurazione** elenca i cinque tipi disponibili. In **E-commerce → Catalogo online**, apri ogni articolo fisico e seleziona **Configuratore del sito**. Salva la bozza e pubblicala. Più articoli possono condividere un tipo e il cliente può scegliere fra quelli pubblicati. Il sito filtra il catalogo per tipo e Atlas verifica la corrispondenza anche al salvataggio del carrello e al riepilogo. I prezzi restano quelli pubblicati per l’articolo.

| Tipo | Scelte che accompagnano l’ordine |
| --- | --- |
| e-disk | Colori della scocca e del piano |
| Bundle e-disk | Colori del giradischi, titolo, colore, dedica e brano per ognuno dei tre dischi |
| Disco e-disk | Titolo, colore, eventuali dedica e link YouTube o Spotify |
| e-linker | Forma, due colori, eventuali scritta e logo |
| e-led | Due colori, scritta e/o logo, effetto, intensità, velocità se applicabile e larghezza indicativa |

I loghi dei configuratori vengono rasterizzati in PNG nel browser e poi normalizzati nuovamente in Atlas. I link dei brani vengono validati e salvati come riferimenti. L’associazione del brano al disco e la scrittura NFC seguono il flusso e-disk esistente. Per gli articoli fisici senza tipo collegato rimane disponibile la personalizzazione semplice. Ogni configurazione ha una propria riga e le quantità massime si applicano alla somma delle righe dello stesso prodotto.

Atlas salva le configurazioni in `commerce_personalizations` con vincoli per negozio, account, carrello e articolo. Una configurazione rimossa va in scadenza. La conferma collega le configurazioni all’ordine nella stessa transazione e conserva colore, scritta e indicatore del logo nel riepilogo storico. I loghi vengono decodificati e ricodificati in PNG fino a 512 pixel per lato, senza metadati, e sono scaricabili dall’anagrafica **E-commerce → Personalizzazioni** dai ruoli Super, Amministrazione e Commerciale. Carrello, riepilogo e cronologia cliente mostrano un riepilogo testuale della personalizzazione.

In Atlas, **E-commerce → Codici sconto** permette a Super e Amministrazione di creare, disattivare e riattivare codici percentuali da 1 a 99. Un codice per riepilogo, applicabile agli articoli e ai servizi, con consegna esclusa. Il codice è riutilizzabile finché attivo. Atlas ricalcola imponibile e IVA sui prezzi scontati e controlla la revisione del codice alla conferma. Disattivare un codice rende obsoleti i riepiloghi che lo usano e lascia validi gli importi degli ordini già confermati.

## Stato ordine e statistiche

Il cliente vede in **I tuoi ordini** gli ordini attivi, ricevuti o annullati, con conteggi dell’intero storico del proprio account. Un ordine passa a Ricevuti quando tutte le righe risultano evase in Atlas. **Aggiorna lo stato** rilegge stato operativo, pagamento, evasione, quantità e tracking. Le fasi, i messaggi e le date del tracking dettagliato seguono il flusso Atlas **Ordini → Pubblicazione cliente**. Dopo una modifica che rende obsoleta la pubblicazione, l’operatore può pubblicare il nuovo riepilogo. La comunicazione descritta qui avviene nell’account del cliente.

In Atlas, **E-commerce → Grafici e statistiche** mostra ordini giornalieri e distribuzione per stato negli ultimi 7, 30 o 90 giorni, nel fuso Europe/Rome. I valori di incasso e rimborso degli ordini del periodo sono visibili con il permesso Pagamenti.

## Checklist di avvio sui due progetti Vercel

1. **Atlas · MongoDB.** Riusa il cluster esistente con TLS e supporto transazioni. Crea o seleziona un database commerce separato da `MONGODB_DB`. Imposta `ECOMMERCE_MONGODB_DB` ed `ECOMMERCE_PROCESSOR_MONGODB_URI`. Usa `processorPrivileges(coreDb, commerceDb)` da `scripts/ecommerce/mongo-privileges.mjs` nella repo Atlas per il ruolo del processore. Il ruolo aggiornato include `commerce_personalizations` e `commerce_discounts`. Atlas inizializza automaticamente collezioni e indici quando apre lo storage commerciale. La credenziale del sito usa `storefrontPrivileges(commerceDb)` e va in `ECOMMERCE_MONGODB_URI` del sito. Se il ruolo Atlas ordinario è ristretto, verifica anche i privilegi di `atlasCustomerRegistryPrivileges(coreDb)` e `atlasRecordAssignmentPrivileges(coreDb)`. Il ruolo responsabile dei record si sceglie su Atlas in **Admin → E-commerce** e parte da Commerciale.
2. **Entrambi · Vercel OIDC.** Imposta lo stesso `ECOMMERCE_SHOP_ID` e `ECOMMERCE_MONGODB_DB` sui due progetti. Sul sito, `ECOMMERCE_ATLAS_ORIGIN` e `ECOMMERCE_INTERNAL_AUDIENCE` valgono l’origine HTTPS di Atlas. Usa la stessa audience in Atlas. `ECOMMERCE_STOREFRONT_ORIGIN` sul sito deve coincidere con `ECOMMERCE_ASSERTION_ISSUER` su Atlas. In Atlas configura `ECOMMERCE_OIDC_ISSUER` e `ECOMMERCE_SITE_SUBJECT`, `ECOMMERCE_SITE_PROJECT_ID`, `ECOMMERCE_SITE_OWNER_ID`, `ECOMMERCE_SITE_ENVIRONMENT` sulle claim del deployment del sito, per esempio soggetto `owner:<team>:project:<progetto>:environment:production` per un sito su deploy Production. Usa l’origine HTTPS effettiva di Atlas anche in `NEXTAUTH_URL` per le modifiche staff. Se Atlas ha Deployment Protection, configura sul sito `ECOMMERCE_ATLAS_PROTECTION_BYPASS` con il valore del progetto Atlas. Il bypass continua a richiedere l’OIDC nelle API interne. [Claim Vercel](https://vercel.com/docs/oidc/reference) · [Audience OIDC personalizzata](https://vercel.com/changelog/custom-oidc-token-audiences).
3. **Sito · Account e Resend.** Crea `ECOMMERCE_AUTH_HMAC_KEY` e il keyring email `ECOMMERCE_AUTH_EMAIL_KEYS` con chiavi casuali indipendenti di 32 byte in base64url, indicizzate dall’ID configurato in `ECOMMERCE_AUTH_EMAIL_KEY_ID`. Riusa l’account Resend e un mittente verificato tramite `ECOMMERCE_AUTH_RESEND_API_KEY` e `ECOMMERCE_AUTH_MAIL_FROM` sul progetto sito. Imposta il mittente come semplice indirizzo email minuscolo. Pubblica termini e privacy account e configura percorsi e versioni nel template env del sito. Pubblica le condizioni di acquisto, imposta `ECOMMERCE_CHECKOUT_TERMS_PATH` e usa in `ECOMMERCE_CHECKOUT_TERMS_VERSION` la stessa versione della policy Atlas. Il sito e Atlas controllano la versione accettata anche alla conferma via API.
4. **Atlas · Catalogo e regole.** Configura e pubblica SKU, prezzi, aliquote e modalità da **E-commerce → Catalogo online**. Imposta `ECOMMERCE_PUBLIC_MEDIA_BASE_URLS` se usi immagini. Assegna il tipo del configuratore agli SKU che vuoi rendere acquistabili da `/shop` e ripubblica. In **E-commerce → Carrelli** configura Paesi, modalità e costi, limiti, versione delle condizioni e mappature ricavo di articoli, consegna e ordini misti. Controlla il collegamento degli account verificati ai Clienti Atlas. Da **E-commerce → Codici sconto** puoi creare il primo codice.
5. **Atlas · Stripe.** Parti da un ambiente Stripe di prova isolato dallo storico live. Imposta `ECOMMERCE_STRIPE_MODE=test`, l’account `acct_…`, la chiave del merchant, `ECOMMERCE_STRIPE_PAYMENT_METHODS=card` e il segreto di firma dell’endpoint. In Stripe Workbench configura un webhook snapshot HTTPS su `/api/ecommerce/webhooks/stripe` del dominio Atlas, raggiungibile da Stripe anche con la protezione Vercel. Seleziona gli eventi elencati in `src/server-utils/ecommerce/payments/webhook.ts` su Atlas. Abilita `ECOMMERCE_STRIPE_ENABLED=true` nell’ambiente di prova quando è configurato. Le credenziali Stripe rimangono sul solo progetto Atlas. [Configurazione webhook Stripe](https://docs.stripe.com/webhooks).
6. **Scheduler privato.** Imposta tre Bearer distinti, casuali, 43–128 caratteri base64url. Configura lo scheduler HTTP perché invii POST vuoti con `Authorization: Bearer …`, senza query, Origin o cookie. Avvia l’email ogni minuto, perché la finestra di consegna è 15 minuti. Per collegamenti Cliente e pagamenti puoi iniziare con una frequenza di un minuto, in base al carico. I worker POST non ricevono direttamente le invocazioni GET del Cron nativo Vercel. Quando un progetto usa Deployment Protection, autorizza anche il chiamante privato al relativo percorso. [Cron Vercel](https://vercel.com/docs/schedules/cron-jobs).
7. **Rilascio coordinato.** Usa Node 22 LTS sui due progetti. Rilascia Atlas con il ruolo Mongo aggiornato e subito dopo il sito. I due aggiornamenti condividono il contratto di conferma ordine. Prima di aprire al pubblico, completa il collaudo nell’ambiente di prova e definisci la gestione su richiesta di chiusura account e cancellazione dei dati cliente e dei loghi ordinati, secondo le policy aziendali.

| Progetto | Worker POST | Bearer da configurare |
| --- | --- | --- |
| Sito | `/api/internal/auth-mail` | `ECOMMERCE_AUTH_DELIVERY_SECRET` |
| Sito | `/api/internal/customer-identities` | `ECOMMERCE_CUSTOMER_SYNC_SECRET` |
| Atlas | `/api/ecommerce/internal/payment-jobs` | `ECOMMERCE_PAYMENTS_WORKER_SECRET` |

## Stato della verifica

Revisione statica dei contratti, autorizzazioni, limiti, isolamento dati, riconferma dei prezzi e idempotenza. Sono stati aggiornati i lockfile senza script di installazione, build, typecheck, test o anteprime. Non sono state lette le env effettive né sono stati modificati deployment, ruoli Mongo, scheduler, Resend o Stripe. Il funzionamento end-to-end rimane da collaudare sui due deployment configurati.
