# E-commerce — passo 9: ordine e ricavo collegato

5 novembre 2026 · Codice predisposto sul lato Atlas; env, collegamenti e collaudo gestiti dall’utente.

## Risultato del passo

Una conferma esplicita di un riepilogo valido crea un ordine **aperto**, un solo ricavo **programmato** collegato e una copia cliente dell’ordine. Il carrello viene convertito e il riepilogo consumato nella stessa transazione. Nessun pagamento viene dichiarato incassato; ordine, pagamento ed evasione sono stati distinti.

Il repository del sito non è stato modificato: nessuna pagina cliente o route pubblica del sito aggiunta in Atlas. La schermata di pagamento Stripe ospitata, i webhook e la riconciliazione appartengono al passo 10; [schede consegna ed EVENTI manuali](ecommerce-consegne-eventi.md) predisposti dal dettaglio ordine al passo 11, [fasi e pubblicazione con anteprima](ecommerce-gestione-ordine.md) predisposte al passo 12, API tracking al passo 13; collegamento del sito al passo 14.

Riferimenti: [checklist](ecommerce-piano-attivita.md), [carrello e quote](ecommerce-carrello-riepilogo.md), [identità](ecommerce-account-negozio.md), [Clienti](ecommerce-collegamento-clienti.md), [API](ecommerce-api-v1.md).

## Cosa vede il personale in Atlas

**E-commerce → Ordini** (`/ecommerce/ordini`) è disponibile a Super, Amministrazione e Commerciale, con verifica server di sessione, approvazione e capability correnti. L’elenco mostra pagine di 30 ordini, filtro sullo stato operativo, numero/data, dati di fatturazione minimi, totale e stati separati. Si possono caricare altre pagine o aggiornare l’elenco.

La scheda `/ecommerce/ordini/{idPubblico}` mostra:

- righe storiche con codice, tipo, quantità, criterio IVA, aliquota, imponibile, imposta e lordo;
- totale storico, avanzamento quantitativo iniziale delle righe prodotto/servizio e stati separati;
- fatturazione e indirizzo di spedizione dichiarati per l’acquisto;
- scelte di spedizione, ritiro e servizio, con istruzioni e costi storici;
- collegamenti al Cliente e al ricavo nelle anagrafiche Atlas, soggetti ai normali permessi di quelle pagine;
- categoria/variante del ricavo complessivo, mappatura privata per riga e cronologia essenziale dell’ordine.

Il dettaglio confronta gli importi correnti del ricavo con quelli originari del collegamento. Assenza del ricavo o importi diversi sono segnalati come da verificare; la lettura non li corregge e non promuove lo stato pagamento. Il ricavo rimane consultabile nelle anagrafiche ordinarie, con i normali permessi.

Il dettaglio di un carrello convertito permette di aprire l’ordine associato. Le schede consegna e gli eventi verranno integrati **dentro questa scheda ordine**, senza richiedere passaggi nelle liste generiche; non sono presenti azioni fittizie di programmazione, incasso o evasione in questo passo.

## Conferma e transazione

Il nuovo servizio riceve soltanto `quotePublicId` e `idempotencyKey`, oltre al principal costruito e firmato dal backend sito. Non accetta Cliente, importi, righe, stati, categoria ricavo, numero ordine o dati di fatturazione liberamente sostituibili nella conferma.

Per una nuova conferma Atlas:

1. Verifica OIDC e attestazione personale del passo 8; acquisisce le guardie correnti su account/sessione/accesso e registra il nonce privato.
2. Verifica proprietà del riepilogo e l’eventuale ricevuta dello stesso tentativo. La chiave è scoped per account/negozio e il contenuto è normalizzato e confrontato tramite hash.
3. Acquisisce la guardia condivisa sui Clienti; rivalida il collegamento commerciale e l’identità corrente. Blocca la configurazione checkout e il catalogo, verificando prodotti pubblicati e fingerprint della sorgente.
4. Rivalida scadenza, consumo, versioni di credenziali/accesso/configurazione/associazione/carrello, identità del profilo/Cliente, totali e mappature per riga. Il carrello deve essere ancora attivo, non vuoto e non scaduto. L’importo lordo deve essere positivo.
5. Assegna il numero, crea la copia storica dell’ordine e inizializza gli stati `open`, `awaiting`, `unfulfilled`. Le righe prodotto/servizio partono con quantità evasa/spedita zero; i costi `delivery` non diventano lavorazioni autonome.
6. Crea il ricavo `programmato` e il collegamento univoco al relativo ordine, con gli stessi importi storici.
7. Consuma il riepilogo mediante confronto di revisione/scadenza e converte il carrello mediante confronto di revisione; salva ricevuta privata, vista cliente, outbox `order_created` e audit.

Tutte le operazioni dati sono sequenziali nello stesso client/sessione Mongo, sui due database dello stesso cluster. Un errore annulla anche numero assegnato, ricavo, collegamento, consumo e ricevute. Non si chiama un provider o si invia un’email dentro la transazione. Gli identificativi/documenti vengono costruiti dentro il callback, compatibile con i retry Mongo.

La numerazione tecnica è `EC-AAAA-NNNNNNNN`, con anno UTC e contatore atomico separato per negozio/anno. È un numero ordine, senza significato di numero fattura. La prima creazione del contatore concorrente può ripetere una volta l’intera transazione abortita. Gli indici univoci proteggono numero, carrello, quote, richiesta originaria e collegamenti ricavo.

## Retry, scadenze e isolamento

| Caso                                               | Comportamento                                                          |
| -------------------------------------------------- | ---------------------------------------------------------------------- |
| Stessa chiave e stessa quote, ordine già creato    | Stesso ordine, `replayed: true`; nessun nuovo ricavo o outbox          |
| Stessa chiave e quote diversa                      | `409 IDEMPOTENCY_CONFLICT`                                             |
| Chiave diversa e stessa quote già convertita       | Stesso ordine, nuova ricevuta minima; nessun nuovo movimento           |
| Quote diversa dello stesso carrello già convertito | `409 ORDER_ALREADY_CREATED`; consultare gli ordini propri              |
| Quote scaduta/modificata senza ordine precedente   | Rifiuto e nessun effetto parziale                                      |
| Quote scaduta dopo una conferma riuscita           | Il retry recupera l’ordine già creato, senza tentare una nuova vendita |
| Replay della stessa attestazione già committata    | `409 REQUEST_REPLAY`; nuovo tentativo HTTP con nuova attestazione      |
| Account sospeso, logout o sessione revocata        | Rifiuto anche per un retry; serve una sessione valida                  |
| Account diversi collegati allo stesso Cliente core | Ordini separati per account; nessuna condivisione implicita            |

Il backend sito deve generare una nuova attestazione per ogni tentativo HTTP e mantenere la stessa chiave commerciale per ritentare la medesima conferma. Un timeout non autorizza a creare una nuova vendita: ripetere la richiesta con la chiave originale e una prova nuova, oppure consultare gli ordini propri.

Una ricevuta permette di rileggere un ordine **già proprio** con autenticazione corrente, anche se il collegamento commerciale o il catalogo sono cambiati dopo l’acquisto. Non autorizza una nuova conversione. La lettura storica non dipende dalla pubblicazione attuale dei prodotti e non riusa indirizzi del Cliente core.

## Ricavi omogenei e misti

Atlas ha una sola categoria/variante sul ricavo principale. L’ordine conserva invece una mappatura privata per ciascuna riga, inclusi gli eventuali costi delle modalità scelte.

- Se tutte le righe hanno la stessa categoria e variante, il ricavo usa quella mappatura.
- Se differisce categoria **o variante**, il ricavo complessivo usa la configurazione esplicita **Ricavo degli ordini misti** in Carrelli → impostazioni riepilogo.
- Se la mappatura mista manca, la conferma viene rifiutata con `503 REVENUE_MAPPING_REQUIRED`, senza scegliere la categoria della prima riga e senza creare movimenti parziali. Una spedizione a pagamento può rendere misto anche un carrello con un solo prodotto.

La configurazione mista è privata e modificabile solo con `ecommerce.checkout.configure` (Super/Amministrazione). Indicare categoria e identificatore della variante ricavo configurata in Atlas. Non viene creata o modificata automaticamente una variante. Il cambio della policy aumenta la revisione: occorre richiedere un riepilogo nuovo prima della conferma.

Il ricavo usa il Cliente commerciale collegato, il nome di fatturazione congelato, provenienza `sitoWeb`, totale netto/IVA/lordo convertiti in euro solo al confine con i campi esistenti e descrizione contenente il numero ordine. Il writer controlla che ordine, stato iniziale, Cliente, importi e mappatura coincidano.

Non si compilano i quattro campi legacy `articolo1`–`articolo4`: il dettaglio completo, fino a 100 righe comprese le modalità, rimane nell’ordine. Non viene inventata una fattura; numero fattura, data fatturazione e data pagamento rimangono assenti. La data di creazione dell’ordine resta `placedAt`. Il movimento non è pagato finché il passo 10 non riconcilia un incasso verificato.

## API interne predisposte

Le seguenti route sono **solo in Atlas**, POST con JSON, senza query/cookie/Origin. Sono ammesse singolarmente dal middleware e richiedono sia OIDC del sito ammesso, sia attestazione personale del passo 8, con verifica di proprietà corrente. Body massimo 32 KiB, risposte `private, no-store` ed errori sanitizzati.

| Route                                       | Input oltre al principal server   | Risposta                                               |
| ------------------------------------------- | --------------------------------- | ------------------------------------------------------ |
| `POST /api/ecommerce/internal/orders/place` | `quotePublicId`, `idempotencyKey` | `{order, replayed}`; `200` anche sul primo inserimento |
| `POST /api/ecommerce/internal/orders`       | `cursor` pubblico opzionale       | `{items, nextCursor}` con massimo 30 sommari           |
| `POST /api/ecommerce/internal/orders/{id}`  | Nessuno                           | Solo il proprio ordine storico                         |

Il principal è `{accountId, sessionId, credentialVersion, accessVersion}`, aggiunto dal backend sito autenticato; mai accettato dal browser. Esempio di contenuto commerciale, prima dell’aggiunta del principal:

```json
{
  "quotePublicId": "80eea858-494b-4c24-bef0-ceb128ff6f81",
  "idempotencyKey": "53ca0960-7df6-4875-bfa5-6dd379f76183"
}
```

Il DTO ordine espone ID pubblico, numero, revisione, data, stati, righe/importi storici, fatturazione, consegna, modalità scelte, condizioni e avanzamento delle proprie righe. Esclude ID Mongo/core, mappature ricavo, collegamenti commerciali, attori e note staff. Il cursore cliente è un ID ordine pubblico e viene risolto solo dentro il proprio account/negozio; il cursore staff è interno.

Le letture cliente usano lo stato autorevole dell’ordine privato con allowlist: non dipendono da una vista potenzialmente arretrata. La vista `commerce_order_views` minima viene comunque creata atomica con l’ordine. Le future transizioni dovranno aggiornare ordine e vista nella stessa transazione.

API staff: `GET /api/ecommerce/staff/orders?status=open&cursor=...`, `GET /api/ecommerce/staff/orders/{id}`. La capability è `ecommerce.orders.view`; nessuna API libera per impostare stato, pagamento, ricavo o totale.

Il helper server condiviso `auth.prepareCommerceRequest()` ammette ora `orders/place` per il futuro POST browser e `orders`, `orders/{id}` per i futuri GET browser. Restituisce JSON/principal firmati da trasportare con OIDC; non monta route o pagine del sito. Le route logiche browser `/api/ecommerce/v1/orders` e `/{id}` restano da integrare al passo 14.

## Dati e privilegi

`commerce_order_requests` conserva ricevute private append-only con hash di chiave/contenuto e riferimento all’ordine. L’ordine contiene copie storiche private di modalità, mappature per riga e mappatura complessiva, oltre alla configurazione opzionale dei ricavi misti. Nessun campo contiene hash password o cookie.

Nuovi campi compatibili sono opzionali o hanno valori predefiniti; il servizio di creazione impone i dati necessari ai nuovi ordini. Atlas prepara collezioni e indici senza riscrivere ordini, ricavi, sessioni, carrelli o quote. [Inizializzazione automatica](ecommerce-modelli-transazioni.md).

Per i dati delle ricevute ordine, il processore dispone solo di `find/insert/listIndexes`, oltre ai permessi di inizializzazione sulle collezioni nominate. Il sito non legge/scrive ricevute ordine, quote, ordini privati, Clienti o Ricavi e non ha CRUD diretto sui carrelli. Non sono aggiunti accessi a `User`, credenziali cliente o calendario. I ruoli reali non sono stati applicati dall’agente.

## Verifica e passo successivo

Eseguiti soltanto controlli statici di sintassi/scope, formattazione e diff. Nessuna build, compilazione TypeScript, test applicativo, connessione Mongo/provider, migrazione, invio email, modifica env reale o distribuzione eseguita dall’agente.

Da collaudare a cura dell’utente nei due ambienti Vercel:

| Caso                                                                               | Evidenza attesa                                                                                   |
| ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Conferma di una quote valida                                                       | Un ordine aperto, pagamento in attesa, evasione iniziale, un ricavo programmato e un collegamento |
| Retry stessa/diversa chiave, doppio click e due schede concorrenti                 | Un solo ordine/ricavo; risposta idempotente o conflitto previsto                                  |
| Quote diverse dello stesso carrello                                                | Nessuna seconda vendita                                                                           |
| Errore dopo creazione ordine/ricavo o durante consumo/vista/outbox                 | Rollback completo su entrambi i database                                                          |
| Prezzo/IVA/prodotto/policy/Cliente modificati, quote/cart scaduti                  | Nuova conferma rifiutata senza movimenti                                                          |
| Carrello misto, tariffa di consegna con mappatura diversa, più di quattro prodotti | Dettaglio completo e un ricavo aggregato esplicito; assenza mappatura blocca                      |
| Primo ordine concorrente di account diversi e cambio anno UTC                      | Numeri univoci, contatore coerente e retry limitato                                               |
| Logout/reset/sospensione concorrente, firma o body alterati, replay                | Rifiuto e nessun effetto parziale                                                                 |
| Account A chiede ordine/cursore di B, anche stesso Cliente core                    | Nessuna lettura o conversione altrui                                                              |
| Ricavo modificato/eliminato attraverso altri strumenti                             | Segnalazione di verifica nel dettaglio; nessuna promozione automatica del pagamento               |
| Elenco/dettaglio e link Cliente/Ricavo con i vari ruoli staff                      | Controlli live e normali ACL delle pagine destinazione                                            |
| Inizializzazione ripetuta o concorrente                                            | Collezioni e indici pronti prima delle operazioni; dati esistenti preservati                      |

Prossimo passo: **10, Stripe Checkout ospitato e incasso verificato**. Dovrà usare l’ordine già creato e i suoi importi congelati, creare tentativi idempotenti, validare le notifiche provider e aggiornare pagamento/ricavo senza chiudere automaticamente la lavorazione. L’outbox `order_created` è durevole ma nessun nuovo worker di email o pagamento viene avviato in questo passo.
