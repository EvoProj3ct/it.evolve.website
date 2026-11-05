# E-commerce — passo 8: carrelli, riepiloghi e consegna

5 novembre 2026 · Codice predisposto sul lato Atlas. Configurazione, collegamenti e collaudo sui due progetti Vercel sono gestiti dall’utente.

## Cosa comprende questo passo

Atlas gestisce carrello, prezzi autorevoli, IVA, dati di fatturazione forniti dal cliente, modalità di consegna/esecuzione e riepiloghi immutabili con scadenza. La pagina staff è `/ecommerce/carrelli`. Non sono creati ordini, ricavi, pagamenti, schede consegna o EVENTI: queste operazioni appartengono ai passi 9–13.

Il repository esterno del sito non è stato modificato. Nessuna pagina cliente, route pubblica del sito o nuova vetrina è stata installata in Atlas. Il pacchetto server condiviso contiene solo il supporto necessario per autenticare le future chiamate. L’integrazione dei percorsi del sito resta al passo 14.

Riferimenti: [checklist](ecommerce-piano-attivita.md), [contratto API](ecommerce-api-v1.md), [catalogo](ecommerce-catalogo-vetrina.md), [identità](ecommerce-account-negozio.md), [collegamento ai Clienti](ecommerce-collegamento-clienti.md).

## Interfaccia Atlas

La sezione **E-commerce → Carrelli** permette al personale con `ecommerce.carts.view` di:

- consultare pagine di 30 carrelli, filtrati per attivi, scaduti, convertiti o tutti;
- aprire articoli, quantità, versioni confermate, scadenza e anteprima degli importi correnti;
- distinguere articoli disponibili, modificati, non disponibili o oltre i limiti;
- leggere fino a cinque riepiloghi recenti, con copie dei dati di fatturazione/consegna e degli importi.

La consultazione non modifica le scelte del cliente. Un riepilogo non scaduto è indicato come **da rivalidare**: l’interfaccia staff non lo dichiara ancora acquistabile sulla base della sola data. La futura conversione dovrà rivalidare tutte le condizioni.

Solo Super e Amministrazione hanno `ecommerce.checkout.configure`. Il pannello **Impostazioni riepilogo** contiene:

- abilitazione esplicita, versione delle condizioni e Paesi ammessi;
- numero massimo di righe prodotto, quantità per riga, importo lordo complessivo e durata del riepilogo;
- obbligatorietà del codice fiscale per privati e della partita IVA per aziende;
- fino a 20 modalità: spedizione, ritiro o servizio, ciascuna con etichetta, istruzioni, Paesi, costo, criterio IVA inclusa/esclusa e aliquota;
- categoria/variante ricavo per eventuali costi di consegna o servizio: è solo una mappatura privata per il futuro passo 9.

I riepiloghi partono **disabilitati**. Non vengono presunte tariffe, aliquote o Paesi. Un costo gratuito deve essere inserito esplicitamente come zero, con criterio IVA e aliquota. Il ritiro abilitato richiede istruzioni. Il salvataggio usa la revisione della configurazione e registra un audit.

I valori iniziali dei soli limiti sono modificabili: 50 righe, 100 unità per riga, 10.000 EUR lordi, durata 15 minuti. Limiti tecnici: 98 righe prodotto, 1.000 unità per riga, 5–30 minuti. Le due righe residue sono riservate agli eventuali costi delle modalità scelte.

## Carrello e riepilogo

### Carrello

Un carrello attivo per account/negozio. Ogni riga conserva esclusivamente ID pubblico del prodotto, quantità e revisione del listing confermata dal cliente. Nessun prezzo proveniente dal browser è accettato. Nessun controllo di magazzino.

Il salvataggio sostituisce l’elenco completo delle righe e richiede `cartPublicId` e `expectedRevision`. Il primo inserimento usa `null` e `0`; le risposte forniscono ID e revisione correnti. Un conflitto restituisce `409 CART_CHANGED`. Non unire automaticamente modifiche concorrenti. Gli articoli duplicati sono rifiutati: il sito li rappresenterà con una sola riga e la quantità totale.

La durata è di 30 giorni, rinnovata quando cambia il contenuto. Le API verificano la scadenza senza attendere il cleanup TTL. La lettura ricalcola l’anteprima dal catalogo corrente. Se cambia la versione, la lettura segnala `changed`; per procedere il cliente deve riconfermare le versioni correnti tramite un nuovo salvataggio. Prodotti ritirati/incoerenti non diventano acquistabili grazie a una copia nel carrello.

### Riepilogo autorevole (`quote`)

Richiede account verificato/attivo, sessione corrente, associazione commerciale valida, carrello attivo e non vuoto, revisioni correnti di prodotti/carrello/configurazione e versione delle condizioni. Le guardie di account, sessione, Cliente, configurazione e catalogo sono acquisite nella stessa transazione della creazione.

Atlas legge nuovamente il catalogo pubblicato, congela nomi/codici/prezzi/IVA e mappature ricavo, calcola le righe e salva fatturazione, consegna e scadenza. La risposta espone una allowlist: niente ID Cliente core, associazioni, fingerprint, guardie, attore o categorie/varianti ricavo.

I dati di fatturazione e spedizione sono forniti dal cliente per questo acquisto. Atlas non precompila né pubblica indirizzi storici dei Clienti. Tipo account ed email devono coincidere con il profilo verificato; ragione sociale/nome e identificativi fiscali già presenti devono risultare coerenti con il Cliente collegato. In caso contrario viene richiesto un controllo tramite assistenza, senza rivelare i dati storici attesi. I Paesi devono essere configurati.

`idempotencyKey` è una stringa pubblica casuale di 16–80 caratteri (UUID consigliato), generata per il tentativo logico. La ricevuta privata conserva hash della chiave e del contenuto normalizzato, scoped per account/negozio. Stessa chiave/contenuto restituisce lo stesso riepilogo solo se ancora valido; contenuto diverso dà `409 IDEMPOTENCY_CONFLICT`. Dopo scadenza o modifica occorre rileggere i dati e usare una nuova chiave. Le ricevute non autorizzano acquisti.

La lettura successiva controlla proprietà, scadenza/consumo, revisioni, accesso/credenziali, associazione, identità commerciale, carrello e catalogo. Una modifica invalida il riepilogo: i suoi importi storici non vengono riscritti.

### Importi e IVA

EUR in centesimi interi, aliquote in punti base. Ogni riga usa il proprio criterio IVA: prezzi inclusi ed esclusi possono coesistere. Il calcolo usa `BigInt`, quantità intera e arrotondamento a metà verso l’alto **per riga**; il totale somma imponibile, IVA e lordo delle righe. Non moltiplicare valori unitari già arrotondati per ricostruire il totale.

Esempio: 100,00 EUR esclusa IVA al 22%, quantità 2 → imponibile 200,00, IVA 44,00, lordo 244,00. Un prezzo 122,00 EUR IVA inclusa al 22%, quantità 2 produce gli stessi totali.

Aliquote e Paesi sono configurazioni commerciali manuali. Non è presente un motore automatico di territorialità, esenzioni o aliquote per destinazione: configurare solo i casi supportati dalle proprie regole prima di abilitare i riepiloghi.

### Consegna ed esecuzione

Un carrello con prodotti fisici richiede **una** scelta tra spedizione e ritiro, compatibile con tutti i prodotti fisici. Un carrello con servizi richiede una scelta servizio. Un carrello misto ha entrambe le scelte, massimo due in totale. Non sono supportate spedizioni separate per righe con modalità incompatibili: occorrono carrelli distinti.

L’indirizzo di spedizione è richiesto soltanto per spedizione e rifiutato per gli altri casi. Il Paese della modalità deve ammettere la destinazione; per ritiro/servizio si considera il Paese di fatturazione. I costi non nulli diventano righe `delivery`, applicate una volta per modalità; le modalità gratuite rimangono nella copia storica senza aggiungere una riga a costo zero.

Le istruzioni non assegnano date o prenotazioni. Schede di lavorazione, previsione, consegna effettiva, timeline cliente ed EVENTI manuali dal dettaglio ordine restano ai passi 11–13. Nessun evento o appuntamento viene creato automaticamente.

## Confine di sicurezza delle API personali

Il backend del sito presenta sia OIDC Vercel, sia `X-Commerce-Assertion`. Non basta inviare un ID account nel body. Il browser non possiede questi token e non chiama Atlas direttamente.

1. Il backend sito verifica cookie `HttpOnly`, origine/CSRF dove richiesto, sessione e limiti condivisi. `auth.prepareCommerceRequest(request, path, input)` costruisce il principal dal contesto verificato; rifiuta un principal fornito nell’input.
2. Il helper firma una prova Ed25519 di 30 secondi, legata a negozio, account, sessione, versioni, issuer/audience, metodo interno `POST`, percorso esatto, hash del JSON inviato e nonce casuale.
3. Atlas verifica l’OIDC del progetto/owner/ambiente ammessi, la firma della prova e tutti quei vincoli. Le route rifiutano query, proprietà extra, cookie, Origin e `X-Storefront-Session`; body JSON massimo 32 KiB.
4. Nella stessa transazione Atlas controlla stato verificato/attivo, scadenze e revoche correnti, aggiorna le guardie e inserisce il nonce in una collezione privata con indice univoco. Il replay di una richiesta già committata restituisce `409 REQUEST_REPLAY`.

Una nuova attestazione è necessaria per ogni tentativo HTTP e per ogni percorso. Su retry del medesimo riepilogo si mantiene la chiave idempotente commerciale e si genera una nuova attestazione. Le letture personali interne sono POST con body firmato; i futuri GET del browser rimangono GET verso il proprio sito.

La chiave di firma della sessione deriva soltanto sul backend sito, con HMAC e separazione di dominio dal segreto di autenticazione e dal cookie opaco. Atlas riceve **solo la chiave pubblica** nella proiezione della sessione: non riceve cookie, chiave HMAC, chiave privata, hash password o hash di autenticazione della sessione.

Le nuove collezioni `commerce_auth_states` e `commerce_session_access` contengono esclusivamente metadati di controllo e chiavi pubbliche. Login, rinnovo e revoche le aggiornano nella stessa transazione delle sessioni originali. Logout corrente, logout globale, cambio/reset credenziali e cambio email impediscono l’uso successivo delle prove revocate; la sospensione usa anche `commerce_account_access`. Il TTL è solo cleanup, non un’autorizzazione.

Il processore Atlas può leggere/aggiornare guardie di questi metadati, ma non leggere account con hash, sessioni opache o token di recupero. Le sessioni ecommerce non creano utenti/ruoli NextAuth e non aprono interfaccia o API staff Atlas.

`ECOMMERCE_ASSERTION_ISSUER` in Atlas deve essere l’origine HTTPS esatta del sito, uguale a `ECOMMERCE_STOREFRONT_ORIGIN` sul sito. `ECOMMERCE_INTERNAL_AUDIENCE` e `ECOMMERCE_ATLAS_ORIGIN` devono coincidere con l’origine HTTPS esatta di Atlas. Nessuno slash finale. Mai loggare cookie, OIDC, attestazioni o chiavi. Una rotazione delle chiavi di autenticazione richiede nuove sessioni, non un fallback permissivo.

## Route predisposte in Atlas

Tutte le route personali sono `POST`, runtime Node, risposte `no-store`, richiedono OIDC + attestazione e sono ammesse singolarmente dal middleware.

| Percorso interno                           | Input oltre al principal server                                                                                                                                              | Risultato                                                         |
| ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| `/api/ecommerce/internal/cart`             | Nessuno                                                                                                                                                                      | Carrello proprio e anteprima corrente                             |
| `/api/ecommerce/internal/cart/items`       | `cartPublicId`, `expectedRevision`, `items[]` con `productPublicId`, `listingRevision`, `quantity`                                                                           | Carrello salvato                                                  |
| `/api/ecommerce/internal/checkout-options` | Nessuno                                                                                                                                                                      | Configurazione pubblicabile, versioni, opzioni e prezzi espliciti |
| `/api/ecommerce/internal/quotes`           | `cartPublicId`, `cartRevision`, `policyRevision`, `termsVersion`, `idempotencyKey`, `billing`, eventuale `shipping`, `fulfillmentSelections[]` con `mode` e `optionPublicId` | Riepilogo autorevole                                              |
| `/api/ecommerce/internal/quotes/{id}`      | Nessuno                                                                                                                                                                      | Riepilogo proprio ancora valido                                   |

Il principal server è `{accountId, sessionId, credentialVersion, accessVersion}`. Gli ID account/sessione sono interni: il futuro handler del sito li aggiunge dal contesto e non li restituisce al browser. Gli altri ID esposti sono pubblici opachi. `billing` e `shipping` seguono gli schemi rigorosi di `checkout/validation.ts`; il prezzo è sempre escluso dall’input.

API staff: `GET /api/ecommerce/staff/carts`, `GET /api/ecommerce/staff/carts/{id}`, `GET/PUT /api/ecommerce/staff/checkout-policy`. Richiedono sessione Atlas, utente approvato e ruolo correnti; la modifica richiede anche Origin, JSON e `X-Atlas-Commerce: 1`.

Codici principali: `CART_CHANGED`, `CATALOG_CHANGED`, `POLICY_CHANGED`, `DELIVERY_CHANGED`, `DELIVERY_INCOMPATIBLE`, `QUOTE_EXPIRED_OR_CHANGED`, `BILLING_INVALID`, `BILLING_REVIEW_REQUIRED`, `IDEMPOTENCY_CONFLICT`, `CUSTOMER_AUTH_REQUIRED`, `REQUEST_REPLAY`, `CHECKOUT_DISABLED`, `CART_LIMIT`, `AMOUNT_LIMIT`. Gli errori non contengono valori core/credenziali né messaggi del driver.

Il futuro backend del sito userà `prepareCommerceRequest` con i soli percorsi consentiti: GET browser per carrello/opzioni/lettura quote, PUT browser per righe, POST browser per creazione quote. Il helper restituisce `{payload, assertion}`; il trasporto dovrà inviare esattamente quel JSON e ottenere OIDC dal contesto Vercel. Non è un proxy generico e non inoltra header del browser. Il collegamento HTTP e le pagine non sono stati implementati in questo passo.

## Dati e privilegi

Nuove collezioni: metadati autenticazione/sessione, `commerce_checkout_policies`, ricevute append-only `commerce_quote_requests` e nonce append-only `commerce_personal_request_claims` con TTL. Il carrello ammette la revisione del listing; la quote conserva copie immutabili delle modalità, dati di validazione commerciale e mappature private.

Le collezioni e gli indici mancanti sono inizializzati dal backend Atlas. Non ci sono script, migrazioni numerate, revoche di sessioni o invalidazioni dei carrelli legate all’aggiunta dei campi. [Funzionamento e permessi dell’inizializzazione](ecommerce-modelli-transazioni.md).

`scripts/ecommerce/mongo-privileges.mjs` produce soltanto documenti di privilegi. Dal passo 8:

- sito: gestione dei nuovi metadati della propria autenticazione; **nessun `find/insert/update` diretto sui carrelli**;
- processore Atlas: `find/insert/update` sui carrelli; `find/update` sui metadati/guardie di accesso senza credenziali; quote/configurazione private;
- ricevute quote e nonce: processore `find/insert`, nessun update/remove; nonce rimossi dal TTL;
- sito senza lettura di quote private, configurazioni private, nonce, ricevute quote, Clienti, Ricavi o utenti Atlas.

Rimuovere gli eventuali privilegi precedenti sui carrelli anziché limitarsi ad aggiungerne. I permessi di inizializzazione restano limitati ad Atlas e alle collezioni nominate; non aggiungere ruoli globali che annullino questa separazione.

## Verifica e prosecuzione

Eseguiti esclusivamente controlli statici di sintassi/scope, formattazione e diff. Nessuna build, compilazione TypeScript, suite applicativa, connessione Mongo/provider, migrazione, modifica env reale o distribuzione è stata eseguita dall’agente.

Da verificare a cura dell’utente nei due ambienti di prova:

| Caso                                                                                   | Esito atteso                                                                 |
| -------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Policy assente/disabilitata o tariffa non configurata                                  | Nessun riepilogo acquistabile                                                |
| Prezzi IVA inclusa/esclusa, quantità e decimali limite                                 | Totali in centesimi riproducibili; somma delle righe                         |
| Due modifiche allo stesso carrello                                                     | Nessuna perdita silenziosa; conflitto di revisione                           |
| Prodotto ritirato o versione/prezzo/IVA cambiati                                       | Riconferma richiesta; vecchia quote rifiutata                                |
| Solo servizi, spedizione, ritiro, carrello misto e modalità incompatibili              | Scelte/Paesi/indirizzi/costi applicati secondo policy                        |
| Stessa chiave/contenuto con nuove prove                                                | Stessa quote se valida; contenuto diverso rifiutato                          |
| Quote/carrello scaduti, policy o Cliente modificati                                    | Vecchia quote rifiutata anche prima del cleanup TTL                          |
| Cookie/OIDC/assertion assenti, token di altro ambiente, percorso/body/account alterati | Rifiuto senza dati personali                                                 |
| Replay di prova committata, logout/reset/sospensione concorrenti                       | Rifiuto; transazioni e guardie coerenti                                      |
| Account A chiede carrello o quote di B                                                 | Nessun accesso; stesso Cliente core non condivide gli ordini                 |
| Ruoli Mongo reali e permessi staff                                                     | Sito senza CRUD carrelli/core, Commerciale senza modifica policy             |
| Inizializzazione ripetuta o concorrente                                                | Collezioni e indici pronti prima delle operazioni; dati esistenti preservati |

Il passo 9 convertirà una quote in **un solo ordine aperto e un solo ricavo collegato**, nella stessa transazione. Dovrà riusare l’autenticazione e le guardie correnti, rivalidare quote/catalogo/policy/carrello/Cliente e consumare la quote una sola volta. Non fidarsi del solo ID quote o di una ricevuta. La mappatura ricavo salvata qui non è ancora un movimento economico.

Fonti delle primitive utilizzate: [RFC 8410, esempio PKCS#8 Ed25519](https://www.rfc-editor.org/rfc/rfc8410.html#section-10.3), [Node 20 `createPrivateKey`](https://nodejs.org/docs/latest-v20.x/api/crypto.html#cryptocreateprivatekeykey), [JOSE: verifica JWT](https://github.com/panva/jose/blob/v6.x/docs/jwt/verify/functions/jwtVerify.md), [JOSE: firma JWT](https://github.com/panva/jose/blob/main/docs/jwt/sign/classes/SignJWT.md).
