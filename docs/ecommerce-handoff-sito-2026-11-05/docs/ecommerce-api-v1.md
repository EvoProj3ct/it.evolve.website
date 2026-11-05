# E-commerce — contratto API v1 e matrice di accesso

5 novembre 2026 · Profilo a due progetti Vercel. Predisposti health, workspace, catalogo, identità separata, collegamento commerciale e servizi Atlas per carrelli/riepiloghi, ordini/ricavi e pagamenti (passi 2–10). Il [passo 11](ecommerce-consegne-eventi.md) aggiunge API esclusivamente staff per schede consegna ed EVENTI manuali; il [passo 12](ecommerce-gestione-ordine.md) completa API staff per fasi, testi, anteprima e pubblicazione/ritiro. Il [passo 13](ecommerce-tracking-api.md) predispone le API personali Atlas di tracking, timeline e consegna con proprietà e attestazione; le route browser del sito restano da integrare al passo 14.

Questo contratto completa il [progetto generale](ecommerce-fase-1.md). I domini reali saranno impostati dall’utente nelle sue env. Le route pubbliche catalogo/account del sito sono fornite come esempi da copiare nel suo repository esterno; per il passo 8 sono implementati soltanto servizi/API/UI di Atlas e il supporto di firma nel pacchetto server. I percorsi futuri rimangono progettuali. Nessun deployment o test applicativo è stato eseguito dall’agente. [Passo 5](ecommerce-catalogo-vetrina.md), [passo 6](ecommerce-account-negozio.md), [passo 8 e contratto effettivo](ecommerce-carrello-riepilogo.md).

## 1. Superfici distinte nei due progetti

Per realizzare il punto 14 nel repository del sito esterno usare il [mandato operativo dettagliato](ecommerce-handoff-agente-sito.md), che riunisce i contratti runtime dei passi 2–13, i template trasferibili e le parti ancora da implementare nel sito. La consegna del mandato non equivale all’avvenuta integrazione o al collaudo.

| Superficie                                                                          | Chiamante        | Autenticazione                                                                                                                  | Funzioni                                                                                      |
| ----------------------------------------------------------------------------------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| API negozio `/api/ecommerce/v1/*` nel sito                                          | Browser del sito | Sessione negozio dove richiesta e CSRF nelle mutazioni cookie; catalogo pubblico                                                | Catalogo, accesso, profilo minimo, carrello, quote e ordini propri                            |
| API staff `/api/ecommerce/staff/*` nel gestionale                                   | Personale Atlas  | Sessione staff, utente attuale e capability; Origin/JSON/header nelle mutazioni; nuova verifica identità nelle azioni sensibili | Workspace, catalogo, account/associazioni, consultazione carrelli e configurazione riepiloghi |
| Canale `/api/ecommerce/internal/*` in Atlas, con route abilitate singolarmente      | Backend del sito | OIDC del progetto sito; carrello/opzioni/quote/ordini anche con attestazione cliente; nessun cookie                             | Health, catalogo, collegamento commerciale, carrello e riepiloghi; nessuna API generica       |
| Ingresso `/webhooks/payments/{provider}`, posizione da fissare nella fase pagamenti | Provider         | Firma ufficiale sul body originale, timestamp e configurazione merchant                                                         | Ricezione durevole di eventi da riconciliare                                                  |

Il worker consuma inbox/code interne con un’identità separata. Non esiste una route pubblica per invocare arbitrariamente il worker, selezionare un tipo di anagrafica o eseguire un comando generico.

Il progetto sito contiene la propria vetrina e area cliente e non distribuisce l’interfaccia Atlas. Le route interne ammesse nel middleware sono elencate esattamente, compresi collegamento commerciale e carrello/quote; i percorsi dinamici hanno formato vincolato. Ogni handler verifica sempre OIDC e le ulteriori prove richieste; non esiste un’eccezione generale per il namespace. Percorsi non previsti seguono il routing/autenticazione del rispettivo progetto.

## 2. Identità della richiesta

### Backend del sito → canale interno Atlas

- `Authorization: Bearer <identità OIDC del servizio>`: verifica con libreria mantenuta, JWKS e issuer configurati dal server. Attesi audience dedicata ad Atlas, owner/progetto del sito e ambiente esatti. Il negozio viene risolto da questa configurazione, mai da un `shopId` libero.
- La sessione negozio è verificata dal backend del sito a partire dal cookie `HttpOnly`. Non viene inoltrata al canale interno come cookie, JWT staff o `X-Storefront-Session`. Dal passo 8 carrello/opzioni/quote/ordini richiedono anche `X-Commerce-Assertion`: prova Ed25519 di 30 secondi, legata a sessione/account/versioni, metodo/percorso e hash del body, con nonce antireplay. Atlas verifica metadati senza hash e revoche nella stessa transazione commerciale. Il backend costruisce il principal; nessun ID account ricevuto dal browser viene considerato attendibile.
- `Content-Type: application/json` per le mutazioni, salvo webhook con formato del provider.
- `Idempotency-Key` per operazioni con effetti persistenti; formato e lunghezza limitati. Non è una credenziale.
- Correlation ID generato o normalizzato sul server, senza trattare un valore arbitrario del client come attendibile nei log.

Cookie di sessione e token OIDC sono segreti e vengono redatti da log, proxy, tracing ed error reporting. Il browser non legge il token OIDC e non chiama il canale interno Atlas. Il browser usa le API del proprio sito, con sessione e protezione CSRF; il backend non deve chiamare se stesso via HTTP per aggiungervi un secondo token. La sola identità OIDC non autorizza mai la scelta di un account da impersonare.

Il backend del sito elimina header di identità ricevuti dal browser e ne ricostruisce di attendibili. Non inoltra `X-User-Id`, ruoli, owner, sessioni staff, path arbitrari o header proxy non verificati.

### Matrice di rifiuto obbligatoria

| Credenziale presentata                  | API negozio nel sito                                             | Canale interno Atlas                                                                             | API staff e interfaccia Atlas     |
| --------------------------------------- | ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ | --------------------------------- |
| Nessuna                                 | Catalogo e flussi iniziali ammessi, nessuna operazione personale | Rifiutata                                                                                        | Nessun accesso autenticato        |
| Sessione negozio valida                 | Solo operazioni del proprio account, con CSRF dove necessario    | Rifiutata                                                                                        | Rifiutata                         |
| Identità OIDC del sito ammesso          | Non sostituisce la sessione cliente                              | Solo route nominate; per carrello/opzioni/quote/ordini serve anche attestazione cliente corrente | Rifiutata                         |
| Sessione/token staff Atlas              | Non sostituisce la sessione negozio                              | Rifiutata come credenziale del canale                                                            | Solo quanto permesso al personale |
| Token OIDC di altro progetto o ambiente | Non autentica un cliente                                         | Rifiutato                                                                                        | Rifiutato                         |
| Firma provider                          | Solo il relativo ingresso webhook                                | Non autentica il canale                                                                          | Non autentica utenti o API staff  |

La visita a un eventuale login pubblico Atlas non costituisce accesso al gestionale; l’account del negozio non è presente nel suo archivio utenti e le sue credenziali non permettono di autenticarsi lì.

## 3. Catalogo delle route del negozio

I percorsi `/v1/*` sotto sono logici e saranno montati sotto `/api/ecommerce` nel sito. **C** = sessione account; **V** = account attivo con email verificata; **L** = collegamento commerciale valido. Le mutazioni cookie richiedono CSRF. Il token del servizio autentica il successivo collegamento sito → Atlas, non viene richiesto al browser per chiamare il proprio sito. I diritti C/V/L sono verificati nell’API e rivalidati nel processore per le operazioni asincrone.

| Metodo / route                                                 | Requisiti aggiuntivi                  | Payload consentito / risultato                                                                                  |
| -------------------------------------------------------------- | ------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `GET /v1/catalog`                                              | Nessuno                               | Cursor e pagina limitati; prodotti pubblicati                                                                   |
| `GET /v1/catalog/{productPublicId}`                            | Nessuno                               | Singolo prodotto pubblicato o `404`                                                                             |
| `GET /v1/product-pages/{slug}`                                 | Nessuno                               | Contenuti e prezzo pubblicati della pagina vetrina; stessa revisione del listing                                |
| `POST /v1/auth/register`                                       | Antiabuso                             | Email, password, nome, versione informative applicabili; risposta generica `202`                                |
| `GET /v1/auth/csrf`                                            | Stessa origine                        | Token CSRF e nonce cookie per le mutazioni                                                                      |
| `POST /v1/auth/verify-email`                                   | Token monouso + password scelta       | `{token,password}`; nessuna sessione automatica o staff                                                         |
| `POST /v1/auth/resend-verification`                            | Antiabuso                             | Email; risposta generica `202`                                                                                  |
| `POST /v1/auth/login`                                          | Antiabuso                             | Email/password; crea soltanto sessione negozio                                                                  |
| `POST /v1/auth/logout`                                         | Cookie se presente                    | `{}`; revoca sessione corrente e JSON `200`                                                                     |
| `POST /v1/auth/logout-all`                                     | C + password corrente                 | `{currentPassword}`; revoca globale e JSON `200`                                                                |
| `POST /v1/auth/forgot-password`                                | Antiabuso                             | `{email}`; risposta generica `202`                                                                              |
| `POST /v1/auth/reset-password`                                 | Token monouso                         | `{token,newPassword}`; revoca sessioni, senza login automatico                                                  |
| `POST /v1/auth/change-password`                                | C + credenziale corrente              | `{currentPassword,newPassword}`; revoca globale                                                                 |
| `POST /v1/auth/change-email`                                   | C + password corrente                 | `{email,currentPassword}`; nessun ricollegamento commerciale implicito                                          |
| `POST /v1/auth/confirm-email`                                  | C + token monouso + password corrente | `{token,currentPassword}`; aggiornamento, notifica e revoca                                                     |
| `GET /v1/me`                                                   | C                                     | Profilo minimo verificato, nessun ID interno; collegamento commerciale al passo 7                               |
| `PATCH /v1/me`                                                 | C                                     | Nome/telefono e campi di contatto dichiarati; non modifica l’anagrafica Atlas                                   |
| `GET /v1/cart`                                                 | C + V                                 | Carrello attivo dell’account e versione                                                                         |
| `PUT /v1/cart/items`                                           | C + V                                 | Lista `{productPublicId,quantity}` e `expectedVersion`; nessun prezzo                                           |
| `POST /v1/checkout/quotes`                                     | C + V + L                             | Carrello/versione, dati fatturazione, consegna consentita, indirizzi e versioni condizioni; risultato asincrono |
| `POST /v1/orders`                                              | C + V + L + idempotenza               | Quote e chiave idempotente; conversione sincrona in Atlas, `{order,replayed}`; route sito da integrare          |
| `GET /v1/operations/{operationPublicId}`                       | C + V                                 | Solo esito minimo dell’operazione propria; mai payload interno o errori stack                                   |
| `GET /v1/quotes/{quotePublicId}`                               | C + V                                 | Riepilogo proprio, totale/versioni/scadenza, nessun ID tecnico Atlas                                            |
| `GET /v1/orders`                                               | C + V                                 | Ordini propri, cursor limitato, filtri dichiarati                                                               |
| `GET /v1/orders/{orderPublicId}`                               | C + V                                 | Dettaglio cliente consentito, anche dopo completamento                                                          |
| `GET /v1/orders/{orderPublicId}/tracking`                      | C + V                                 | Fase di lavorazione, consegne e previsioni pubblicate del proprio ordine                                        |
| `GET /v1/orders/{orderPublicId}/timeline`                      | C + V                                 | Tutti gli eventi pubblicati relativi al proprio ordine, cursor e limiti                                         |
| `GET /v1/orders/{orderPublicId}/deliveries/{deliveryPublicId}` | C + V                                 | Dettaglio pubblico di una consegna effettivamente appartenente a quell’ordine/account                           |
| `POST /v1/orders/{orderPublicId}/payment-session`              | C + V + idempotenza                   | Riprende un pagamento ammesso dello stesso ordine; nessun importo o URL libero                                  |

Non ci sono endpoint cliente per impostare “pagato”, modificare righe di un ordine confermato, leggere ricavi, scegliere `customerId`, cambiare associazioni commerciali, importare dati o richiedere rimborsi automatici. Nella prima versione il cliente contatta l’assistenza per annullamenti e rettifiche; i riferimenti sono mostrati sul sito.

Le API e-commerce non accettano token NFC, inviti Atlas, `NEXTAUTH_SECRET` o password staff come sostituti della sessione negozio. Se una persona usa volontariamente la stessa password nei due sistemi, restano due account indipendenti: nessuna procedura li collega in base alla sola email.

Il contratto operativo del passo 6, inclusi payload esatti, endpoint staff e worker email privato sul sito, è in [Account del negozio](ecommerce-account-negozio.md). Gli esempi precedenti del passo 5 e quelli nuovi del passo 6 usano entrambi `/api/ecommerce/v1` nel sito. Le route acquisto restano progettuali.

### Collegamento commerciale predisposto al passo 7

Sul sito: `GET /api/ecommerce/v1/me/customer-link` e `POST` sullo stesso percorso con body `{}`. Sessione, limiti e, nel POST, CSRF/Origin/JSON. Risposta con soli `status`, `checkoutReady`, `message`; nessun account/Cliente scelto dal browser. Il flag indica soltanto il prerequisito commerciale, non attiva ancora acquisti o pagamenti.

Atlas offre le route OIDC esatte `POST /api/ecommerce/internal/customer-link` e `POST /api/ecommerce/internal/customer-identities/reconcile`; la seconda pianifica/processa i job con lease. Le decisioni staff sono in `GET/POST /api/ecommerce/staff/accounts/{profileId}/customer-link`, con capability e nuova conferma password nelle mutazioni. [Payload, template e attivazione](ecommerce-collegamento-clienti.md). Le pagine cliente rimangono nel repository esterno del sito.

## 4. Contratti rappresentativi

**Contratto implementato al passo 13:** [tracking, timeline e dettaglio consegna](ecommerce-tracking-api.md). Atlas espone POST interni nominativi `orders/{id}/tracking`, `orders/{id}/timeline`, `orders/{id}/deliveries/{deliveryId}` con OIDC e attestazione personale. Lettura soltanto della proiezione approvata, proprietà per account/negozio/ordine, nonce, limite richieste e timeline di 20 eventi con cursore della pubblicazione. Vista non approvata: `not_available` per riepilogo/timeline globale; dettagli non visibili: `404` uniforme. La credenziale sito non legge più direttamente `commerce_tracking_views`; il client server del pacchetto usa la sessione senza esporre principal o token al browser. Nessuna pagina/route del sito montata qui.

**Contratto implementato al passo 10:** [API, configurazione e sicurezza Stripe](ecommerce-pagamenti-stripe.md). Atlas espone POST personali nominativi `orders/{id}/payment-session` e `payment-status` con OIDC e attestazione. Il webhook effettivo è `POST /api/ecommerce/webhooks/stripe`, con firma SDK sul body originale; il worker è `POST /api/ecommerce/internal/payment-jobs`, con Bearer dedicato e richiesta vuota. SDK 23.1.0/API `2026-10-28.endive`, importi dall’ordine, creazioni provider fuori dalle transazioni Mongo e incassi/rettifiche idempotenti dopo verifica. Gli endpoint staff Pagamenti richiedono capability e nuova password nelle mutazioni. Atlas inizializza le collezioni e gli indici mancanti senza migrazioni numerate. Nessuna pagina/route pubblica del sito aggiunta qui. I percorsi progettuali sotto non sostituiscono questo contratto effettivo.

**Contratto implementato al passo 9:** [ordine, ricavo e API effettive](ecommerce-ordini-ricavi.md). Atlas espone POST interni `orders/place`, `orders`, `orders/{id}` con OIDC e attestazione personale; la conferma riceve solo quote e chiave idempotente e restituisce `{order, replayed}` con `200`. Ordine/ricavo/consumo/carrello/ricevuta/vista/outbox sono nella stessa transazione sincrona. Nessun polling inbox né incasso in questo passo. Le route pubbliche del sito rimangono da integrare. Collezioni e indici sono inizializzati automaticamente da Atlas.

**Contratto implementato al passo 8:** [route, payload e vincoli completi](ecommerce-carrello-riepilogo.md). Atlas espone POST interni nominativi `cart`, `cart/items`, `checkout-options`, `quotes`, `quotes/{id}`, tutti con OIDC e attestazione cliente; le letture personali sono POST con body firmato. Le corrispondenti route browser rimangono da integrare nel repository sito al passo 14. L’idempotenza quote usa `idempotencyKey` nel JSON; il salvataggio carrello usa ID/revisione. Le quote sono transazioni sincrone con ricevute private, senza polling/inbox pubblica. Le sezioni asincrone sotto descrivono i futuri comandi di pagamento. Non utilizzare gli esempi progettuali come payload libero delle API già implementate.

Esempi progettuali; nomi, valori e identificativi sono fittizi.

### Prodotto pubblico

```json
{
  "id": "a547a0df-90d4-42d3-b0ca-5b4624a2d98c",
  "slug": "servizio-configurazione",
  "code": "SERV-001",
  "name": "Servizio di configurazione",
  "kind": "service",
  "description": "Descrizione approvata per il sito",
  "price": {
    "currency": "EUR",
    "unitAmountCents": 10000,
    "taxMode": "exclusive",
    "unitNetCents": 10000,
    "unitTaxCents": 2200,
    "unitGrossCents": 12200,
    "taxRateBasisPoints": 2200
  },
  "revision": 7,
  "fulfillmentModes": ["service"],
  "publishedAt": "2026-11-04T10:00:00.000Z"
}
```

Il sito mostra il lordo da pagare e le informazioni fiscali definite per la vendita. Non espone `productId` Mongo, costo di produzione, note, proprietario, elenco documenti o metadati dei ruoli. L’importo finale di più unità è calcolato sulla riga dalla quote; non si deduce moltiplicando una ripartizione IVA unitaria già arrotondata.

### Aggiornamento carrello

```json
{
  "expectedVersion": 3,
  "items": [{ "productPublicId": "prd_public_id", "quantity": 2 }]
}
```

Ogni riga è normalizzata; duplicati dello stesso prodotto vengono rifiutati o aggregati secondo una sola regola dichiarata, proposta: rifiuto. Quantità positive intere, quantità zero non usata come cancellazione implicita. Per svuotare il carrello: lista vuota con versione valida. Il server non conserva prezzi inviati dal browser.

### Creazione ordine

```json
{
  "quotePublicId": "quo_public_id",
  "acceptedRevision": 1
}
```

Intestazione `Idempotency-Key` obbligatoria. Risposta iniziale:

```json
{
  "operationId": "op_public_id",
  "status": "pending"
}
```

HTTP `202` e `Retry-After` limitato. L’esito pronto restituisce l’ID pubblico ordine e un URL del checkout creato dal provider, verificato contro origini ammesse. Callback/return URL sono configurate dal server, non scelte dal payload.

Il cliente riprende la stessa operazione dopo un timeout. L’idempotenza è legata a negozio, account, operazione e contenuto normalizzato; la durata della ricevuta deve coprire almeno tutto il ciclo recuperabile dell’acquisto. La sua eventuale pulizia non rimuove i vincoli durevoli su carrello/quote/ordine.

### Ordine visibile al cliente

Proprietà ammesse: ID pubblico, numero, data, righe acquistate con descrizione approvata e importi storici, totali, indirizzi forniti per quell’acquisto, stato operativo/pagamento/evasione per riga, messaggi pubblici e riferimento assistenza. Nessun ID anagrafica, ricavo, owner, costo, nota interna, audit staff o messaggio di riconciliazione riservato.

L’API legge `StorefrontOrderView`; non legge l’ordine interno per poi nasconderne alcune proprietà. Ogni documento della vista contiene `shopId` e `accountId`, usati nel filtro di accesso; non sono modificabili dal client.

### Scheda vetrina e tracking

La scheda vetrina deriva da `StorefrontProductPageView`: slug e ID pubblico, testi strutturati e media approvati, prezzo, IVA, modalità di evasione e revisione pubblicata. Una bozza non viene restituita; il sito non può scegliere importi o campi anagrafici arbitrari con parametri di projection. L’eventuale prezzo online dedicato è una configurazione staff del listing, non un override del browser.

Il tracking deriva da `StorefrontTrackingView`, mai dalle API EVENTI generiche. Il [passo 12](ecommerce-gestione-ordine.md) predispone la proiezione approvata con controlli di versione/hash e ritiro dei contenuti obsoleti; il [passo 13](ecommerce-tracking-api.md) aggiunge le route personali Atlas effettive. Le route GET browser restano da collegare nel sito. La previsione distingue data senza orario, istante e finestra; eventi futuri sono programmati e non attività già concluse. Eventi non pubblicati, owner, partecipanti, note e allegati interni restano esclusi. Una consegna o un evento di altro ordine non è leggibile neppure se i due ordini fanno riferimento allo stesso cliente commerciale. Il ritiro della pubblicazione deve aggiornare la proiezione senza lasciare contenuti riservati accessibili in una vecchia cache.

Il sito non dispone di mutazioni su consegne, eventi, date, pubblicazione o calendario. Dettagli e esempio payload: [pagamenti, consegne e vetrina](ecommerce-pagamenti-consegne-vetrina.md).

## 5. API del personale

Superficie interna nel gestionale, con sessione Atlas e capability applicate sul server. Il token del sito non è una credenziale ammessa.

| Gruppo di operazioni                          | Capability nel codice            | Autorizzazione iniziale                                             |
| --------------------------------------------- | -------------------------------- | ------------------------------------------------------------------- |
| Accedere al workspace                         | `ecommerce.workspace.view`       | Super, Amministrazione, Commerciale                                 |
| Leggere ordini                                | `ecommerce.orders.view`          | Super, Amministrazione, Commerciale                                 |
| Avanzare lavorazione/righe                    | `ecommerce.orders.manage`        | Super, Amministrazione, Commerciale                                 |
| Gestire schede consegna ed eventi manuali     | `ecommerce.fulfillments.manage`  | Super, Amministrazione, Commerciale                                 |
| Pubblicare/ritirare eventi e messaggi cliente | `ecommerce.fulfillments.publish` | Super, Amministrazione                                              |
| Preparare catalogo                            | `ecommerce.catalog.edit`         | Super, Amministrazione, Commerciale                                 |
| Pubblicare/ritirare e cambiare regole prezzi  | `ecommerce.catalog.publish`      | Super, Amministrazione                                              |
| Leggere profili minimi sito                   | `ecommerce.customers.view`       | Super, Amministrazione; Commerciale solo dati necessari agli ordini |
| Associare manualmente clienti                 | `ecommerce.customers.resolve`    | Super, Amministrazione + nuova verifica identità futura             |
| Sospendere/revocare accesso                   | `ecommerce.accounts.suspend`     | Super, Amministrazione + nuova verifica identità                    |
| Annullare ordine non pagato                   | `ecommerce.orders.cancel`        | Super, Amministrazione                                              |
| Avviare rimborso                              | `ecommerce.payments.refund`      | Super, Amministrazione + MFA/verifica recente                       |
| Riconciliazione e configurazione integrazione | `ecommerce.integration.manage`   | Super, Amministrazione; segreti gestiti fuori dal frontend          |

La policy esplicita è in `src/config/access/ecommerce-access.config.ts`; menu e pagine applicano i diritti per sezione, senza presumere che una voce di menu conferisca permessi. Ogni richiesta server rilegge utente e approvazione correnti. L’API workspace restituisce solo sezioni/capability; il passo 5 aggiunge bozza, anteprima, pubblicazione e ritiro catalogo con versioni, Origin esatta, JSON/header dedicato, body limitato e audit. Nuova verifica identità/MFA e servizi per ordini, associazioni e rimborsi restano ai relativi passi. [Workspace](ecommerce-workspace-atlas.md), [catalogo e confini API](ecommerce-catalogo-vetrina.md).

Mutazioni di ordine con `expectedVersion`, azioni nominali e audit: per esempio “avvia lavorazione”, “segna riga consegnata”, “richiedi annullamento”. Non un PATCH libero di `status`, `paymentStatus` o `totals`. Una modifica del cliente successiva all’ordine non ne riscrive la copia storica.

Operazioni staff aggiuntive proposte per l’interfaccia integrata nella scheda ordine:

| Metodo / percorso interno                                                       | Effetto                                                                                             |
| ------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `GET/POST /api/ecommerce/orders/{orderId}/fulfillments`                         | Elenca o crea manualmente la scheda consegna/evasione con righe e quantità validate                 |
| `PATCH /api/ecommerce/fulfillments/{fulfillmentId}`                             | Modifica campi consentiti con versione; non trasferisce liberamente la scheda a un altro ordine     |
| `POST /api/ecommerce/fulfillments/{fulfillmentId}/phase`                        | Aggiorna la fase con data effettiva; eventuale EVENTO solo se esplicitamente confermato nel dialogo |
| `POST /api/ecommerce/fulfillments/{fulfillmentId}/events`                       | Crea manualmente un EVENTO collegato alla scheda, con utente staff e `_autoEvent=null`              |
| `PATCH /api/ecommerce/fulfillments/{fulfillmentId}/events/{eventId}`            | Modifica/riprogramma lo stesso EVENTO, con vincoli di relazione/versione                            |
| `POST /api/ecommerce/fulfillments/{fulfillmentId}/expected-delivery`            | Seleziona l’evento principale per la previsione della scheda                                        |
| `POST /api/ecommerce/fulfillments/{fulfillmentId}/events/{eventId}/publication` | Pubblica/ritira soltanto campi cliente e aggiorna la proiezione                                     |
| `GET /api/ecommerce/orders/{orderId}/customer-preview`                          | Anteprima staff dello stesso DTO pubblico ordine/tracking, senza impersonare l’account cliente      |

Tutti i riferimenti annidati devono appartenere realmente al relativo ordine. Le modifiche dello stesso evento dal calendario o dall’editor generico passano dal medesimo writer per preservare previsione, ACL e proiezione; una nuova route dedicata non deve lasciare un percorso generico che aggiri i controlli. Il frontend non decide l’attore, `_autoEvent` o gli account destinatari della pubblicazione.

## 6. Messaggi interni e worker

**Aggiornamento passi 8–9:** creazione quote e conferma ordine/ricavo sono ora transazioni sincrone nelle API personali nominate, con attestazione e ricevute private. Non usare l’inbox generica per aggirare questo flusso. L’envelope e i job sotto descrivono le operazioni asincrone residue/future, in particolare gli effetti esterni e i pagamenti.

Envelope interno: ID comando, tipo/versione schema, negozio, principal validato, risorsa pubblica, payload consentito, hash richiesta, idempotenza, timestamp e correlation ID. Nessun campo `isAdmin` o ruolo copiato dal browser.

Tipi previsti: collegamento cliente verificato, compilazione catalogo, creazione/ripresa pagamento, riconciliazione, annullamento, rimborso e aggiornamento vista. La superficie pubblica può generare solo il sottoinsieme associato alle sue route; pubblicazione, rimborsi, associazioni manuali e comandi staff usano inbox/identità distinte. Il worker non può fidarsi del solo nome del comando per stabilire l’autorità di chi lo ha emesso.

Inbox pubblica: permesso di inserire messaggi con schema validato, senza leggerne il payload o modificarli per dichiararli eseguiti. Una ricevuta minima immutabile, inserita nella stessa transazione, consente al sito la deduplicazione senza accesso all’inbox o all’esecuzione. Il server calcola l’hash del contenuto canonico; una chiave riutilizzata con contenuto diverso produce `409`. Stato di esecuzione/lease in `StorefrontOperation`, non leggibile dalla credenziale pubblica; esito minimo del cliente in `StorefrontOperationView`. Claim atomico, tentativi limitati, backoff e coda errori; schema, corrispondenza ricevuta/comando e autorizzazione rivalidati prima di qualsiasi effetto.

Quote, ordine, collegamento ricavo, vista e outbox si aggiornano in transazioni appropriate. Per cancellazioni o sospensioni concorrenti il worker verifica nuovamente lo stato prima del commit e prima/dopo le chiamate esterne. Se una sessione provider viene creata dopo un annullamento concorrente viene invalidata/riconciliata, senza pubblicare un pagamento utilizzabile per un ordine già annullato.

## 7. Errori, limiti e comportamento del sito

Formato errore previsto:

```json
{
  "error": {
    "code": "CART_VERSION_CONFLICT",
    "message": "Il carrello è cambiato. Ricarica il riepilogo.",
    "requestId": "req_public_id"
  }
}
```

| Stato HTTP    | Significato                                                          |
| ------------- | -------------------------------------------------------------------- |
| `200/201/204` | Operazione completata secondo contratto                              |
| `202`         | Richiesta accettata, esito da attendere; non significa ordine pagato |
| `400/422`     | Input/formato non valido, con errori per campo consentiti            |
| `401`         | Credenziale/sessione mancante, scaduta o non valida                  |
| `403`         | Account verificabile ma azione non permessa / verifica necessaria    |
| `404`         | Risorsa assente o non appartenente all’account                       |
| `409`         | Versione, prezzo, stato o chiave idempotente in conflitto            |
| `413/415`     | Body troppo grande / formato non ammesso                             |
| `429`         | Limite condiviso superato, con `Retry-After`                         |
| `503`         | Dipendenza necessaria indisponibile; nessun fallback permissivo      |

Codici applicativi iniziali: `AUTH_REQUIRED`, `EMAIL_VERIFICATION_REQUIRED`, `ACCOUNT_UNAVAILABLE`, `CUSTOMER_LINK_REVIEW_REQUIRED`, `CART_VERSION_CONFLICT`, `CATALOG_CHANGED`, `QUOTE_EXPIRED`, `IDEMPOTENCY_CONFLICT`, `ORDER_STATE_CONFLICT`, `PAYMENT_PENDING`, `OPERATION_FAILED`. Nessun codice pubblico che riveli “email presente tra gli utenti Atlas” o i candidati cliente trovati.

Limiti sono applicati prima dell’hashing, dell’accodamento e delle chiamate al provider. Login/recupero/verifica hanno risposte uniformi, controllo dei tempi e protezioni contro enumeration/credential stuffing. Un limite per email/account non deve consentire un blocco permanente provocabile da terzi.

Il polling ha intervallo e scadenza controllati; niente loop senza limite. In caso di attesa prolungata, il sito conserva ID operazione e permette ripresa, mostrando lo stato effettivo. Durante indisponibilità del worker non dichiara l’ordine riuscito e non suggerisce di pagare nuovamente.

Solo il catalogo ammette cache pubblica. Tutte le risposte personali, di autenticazione e pagamento sono `private, no-store`; le operazioni asincrone e i loro URL richiedono sempre autenticazione e proprietà, anche se l’ID è casuale.

## 8. Condizioni prima di congelare OpenAPI

Confermare dominio e progetto Vercel, provider/metodi online, dati obbligatori per privati/aziende e consegna, limiti di importo e retention. Versionare gli schemi e produrre esempi di esito positivo e di rifiuto per ogni route. Il futuro SDK del sito espone soltanto queste operazioni e non incorpora client generici delle API Atlas.

Fonti per i controlli tecnici: [Vercel OIDC](https://vercel.com/docs/oidc/api), [OWASP REST](https://cheatsheetseries.owasp.org/cheatsheets/REST_Security_Cheat_Sheet.html), [autorizzazione per oggetto](https://owasp.org/API-Security/editions/2023/en/0xa1-broken-object-level-authorization/). I nomi delle route e i payload di questo documento sono scelte progettuali specifiche per questa integrazione.
