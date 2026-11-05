# Passo 12 — Lavorazione, pubblicazione e anteprima dall’ordine

5 novembre 2026 · Codice predisposto esclusivamente in Atlas. Build, compilazione TypeScript, test applicativi, collegamenti, env e collaudo dei due progetti Vercel restano all’utente. Nessuna connessione Mongo, pubblicazione reale, invocazione provider o modifica di env reali effettuata dall’agente.

## Percorso operativo

In **E-commerce → Ordini → dettaglio → Lavorazione e consegne** si gestiscono le schede e gli EVENTI del [passo 11](ecommerce-consegne-eventi.md), le fasi effettive, lo stato operativo dell’ordine e i contenuti dell’area cliente. Non occorre passare dalle liste generiche. **Consegne e lavorazione** mostra anche la fase di ogni scheda e rimanda all’ordine.

1. Creare le schede assegnando righe e quantità ordinate; programmare a mano gli EVENTI e scegliere l’evento principale di previsione.
2. Da **Gestisci fase**, registrare preparazione, spedizione, consegna/ritiro o completamento del servizio, con motivo e date effettive quando richieste. Il riepilogo mostra quantità evase e spedite per riga.
3. Usare **Stato operativo ed evasione** per avviare, sospendere, riprendere o chiudere l’ordine. La chiusura non viene dedotta dal pagamento o da un evento.
4. In **Contenuti dell’area cliente**, scrivere titoli e messaggi cliente dedicati, selezionare esattamente schede ed eventi da mostrare e preparare l’anteprima. Si può selezionare soltanto lo stato dell’ordine.
5. Super/Amministrazione conferma **Pubblica questa anteprima** oppure ritira la vista con un motivo. Commerciale può preparare testi e anteprima. I contenuti attualmente pubblicati sono consultabili separatamente dalla nuova bozza.

Le informazioni pubblicate sono predisposte in `commerce_tracking_views`. Il [punto 13](ecommerce-tracking-api.md) predispone le API personali Atlas con autenticazione, attestazione e proprietà dell’ordine; il sito esterno e il suo layout restano da integrare al punto 14. “Pubblicare” qui significa approvare e salvare la proiezione dati in Atlas: non distribuisce pagine, non invia email e non rende pubblico il calendario.

## Fasi delle schede e quantità

La scheda conserva `status=active/cancelled`, distinto da `phase`. Le nuove proprietà sono opzionali o hanno valori predefiniti: una scheda esistente priva di fase viene considerata `planned`. Nessuna migrazione o riscrittura automatica dei documenti.

| Modalità   | Percorso consentito                         |
| ---------- | ------------------------------------------- |
| Spedizione | `planned → preparing → shipped → delivered` |
| Ritiro     | `planned → preparing → delivered`           |
| Servizio   | `planned → preparing → service_completed`   |

Da `preparing` si può tornare a `planned`. La stessa fase può essere registrata per correggere date effettive, sempre con motivo, revisione e cronologia. Dopo spedizione o completamento non si torna a fasi precedenti e non si modificano modalità/quantità o si annulla la scheda. Per una rettifica economica usare i flussi dedicati dei pagamenti, senza riscrivere la consegna storica.

L’avanzamento verso preparazione, spedizione o completamento richiede incasso `paid`, nessuna anomalia di pagamento da verificare e ordine non sospeso. Una correzione della stessa fase non registra nuove quantità e conserva lo storico anche dopo un rimborso. Schede annullate non avanzano. Ordini completati o annullati non ammettono modifiche operative; solo gli amministratori possono riaprire un ordine completato. Gli ordini annullati non si riaprono con questo flusso.

La spedizione richiede `shippedAt`; consegna/ritiro e servizio completato richiedono `completedAt`. Date effettive UTC canoniche, successive alla ricezione dell’ordine e non future, salvo cinque minuti di tolleranza. La consegna non può precedere la spedizione. Il form mantiene il fuso **Europe/Rome** e i controlli su ore inesistenti/ripetute del passo 11.

Ogni fase vale per tutte le quantità assegnate alla scheda. Per consegne parziali creare più schede, rispettando il limite complessivo delle quantità ordinate. Righe costo consegna escluse dall’evasione, nessun magazzino. Per ogni riga, il riepilogo somma quantità completate e, solo per le spedizioni, quantità spedite. La fase sintetica della riga indica l’avanzamento raggiunto da almeno una sua parte; le quantità indicano quanta parte è effettivamente evasa.

Evasione complessiva: `unfulfilled` senza preparazioni/esecuzioni, `in_progress` con preparazioni, `partial` se alcune quantità sono spedite o evase, `fulfilled` quando tutte le quantità di prodotti/servizi sono completate. Una prima esecuzione porta un ordine aperto a `in_progress`; la chiusura in `completed` resta esplicita. La sospensione rimane tale finché un operatore non la rimuove.

## Stato operativo dell’ordine

| Azione            | Stato di partenza     | Risultato e controlli                                                                                                                          |
| ----------------- | --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Avvia             | `open`                | `in_progress`, con incasso verificato                                                                                                          |
| Sospendi          | `open`, `in_progress` | `on_hold`; impedisce nuovi avanzamenti effettivi                                                                                               |
| Riprendi          | `on_hold`             | `in_progress` se già lavorato/pagato, altrimenti `open`; blocco in presenza di contestazioni o anomalie                                        |
| Chiudi completato | `open`, `in_progress` | Tutte le quantità evase, pagamento verificato (`paid` o rimborso successivo), nessuna anomalia e nessun EVENTO programmato sulle schede attive |
| Riapri completato | `completed`           | `in_progress`, solo `ecommerce.orders.reopen`, Super/Amministrazione                                                                           |

Motivo obbligatorio e ricevuta idempotente per ogni operazione. Le date pianificate e gli EVENTI non avanzano automaticamente le fasi; cambiare fase non crea, completa o annulla EVENTI. Prima di chiudere l’ordine, l’operatore deve concludere o annullare a mano gli eventi ancora programmati.

Pagamento e ricavo restano indipendenti: nessuna modifica diretta a incassi, rimborsi o contabilità tramite i comandi di lavorazione. L’annullamento economico rimane nel flusso Pagamenti già protetto da capability e conferma password.

## Testi, selezione e anteprima cliente

Ogni scheda ed EVENTO ha `customerTitle` e `customerMessage`, distinti dal titolo operativo e dalle note interne. Le nuove schede/eventi li possono preparare nel form; **Testi cliente** permette di correggerli anche a ordine concluso, senza riaprire l’esecuzione. Un elemento selezionato richiede un titolo cliente non vuoto; nessun ripiego automatico sui titoli interni.

La selezione esplicita è una lista di `{cardId,eventIds}`. Gli eventi devono appartenere alla scheda selezionata e all’ordine corrente. Nessun elemento nuovo viene aggiunto automaticamente. La previsione della scheda viene inclusa solo se il suo EVENTO principale è tra quelli selezionati e non è annullato. Le schede annullate possono comparire come storico; per un ordine annullato è consentita solo la pubblicazione dello stato complessivo, senza schede pianificate.

La proiezione approvabile è limitata a 512 KiB UTF-8, oltre ai limiti di 100 schede e 500 eventi. Se la selezione è troppo grande, ridurre testi o numero di eventi: l’anteprima restituisce `413` prima della pubblicazione.

L’anteprima e la vista pubblicata usano lo stesso DTO positivo e lo stesso componente di visualizzazione in Atlas. Mostrano stato operativo/evasione, titoli cliente, messaggi, modalità, righe/quantità con titoli storici dell’ordine, previsioni ed esecuzioni effettive, eventi selezionati. Non includono note/titoli interni, ID Mongo, Cliente core, attori, motivi di gestione, segreti, importi contabili o dati del calendario generale. Gli ID pubblici restano nel DTO per le future API personali. Il sito potrà impaginare diversamente gli stessi contenuti.

Prima del salvataggio il server ricostruisce la selezione dal DB e verifica negozio, relazioni, quantità, revisioni e hash dell’anteprima. Dopo il casting Mongoose rilegge la proiezione nella stessa transazione e confronta nuovamente l’hash: un contenuto diverso annulla tutta la pubblicazione. I testi sono testo semplice e vengono visualizzati con escaping React.

## Pubblicazione, ritiro e concorrenza

`fulfillmentRevision` dell’ordine cambia a ogni modifica di schede, eventi, testi cliente, fasi operative o spostamento nel calendario. Le operazioni sono serializzate dalla guardia sull’ordine e salvate nella stessa transazione di binding/anagrafiche/EVENTI/audit/vista, sul medesimo MongoClient.

Gli stati di pubblicazione sono `unpublished`, `published`, `stale`, `withdrawn`. Una modifica successiva ritira la proiezione esistente e marca la pubblicazione come `stale`; occorre preparare e approvare una nuova anteprima. Anche modifiche solo interne richiedono nuova approvazione: è una scelta conservativa esplicita. Un cambio operativo/evasione effettuato dai servizi pagamento, incluso annullamento, invalida allo stesso modo il tracking. Un aggiornamento del solo pagamento non cambia il contenuto del tracking.

Il ritiro è possibile anche per un ordine concluso. Mantiene la selezione e i metadati dell’ultima approvazione come riferimento interno, elimina la proiezione consultabile tramite le API personali e registra il motivo. L’indisponibilità temporanea del tracking non elimina l’ordine o il suo stato pagamenti.

Ogni pubblicazione/ritiro controlla revisione della lavorazione e versione della pubblicazione. La pubblicazione controlla inoltre l’hash dei contenuti selezionati. Una richiesta obsoleta produce `409`; non viene reinterpretata come approvazione dei dati nuovi. Le ricevute per staff/negozio/operazione deduplicano fasi, azioni ordine, pubblicazione e ritiro: stessa chiave/contenuto restituisce il risultato registrato, contenuto diverso produce `409`. La modifica testuale usa la revisione dell’elemento e non duplica effetti economici.

`publishedTracking(tx,order)` è usato dal [lettore del punto 13](ecommerce-tracking-api.md): richiede un ordine già autorizzato nella stessa transazione e restituisce contenuto solo quando approvazione, account/negozio/ordine, revisione sorgente, versione, stati e hash coincidono. Una vista assente, legacy o incoerente viene trattata come da riapprovare, senza mostrare contenuti. Questo helper non autentica da solo un cliente: le route personali aggiunte al passo 13 verificano OIDC, attestazione e proprietà prima di usarlo.

## API e permessi Atlas

| Metodo / percorso                                                     | Scopo                                                                         |
| --------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| `GET /api/ecommerce/staff/orders/{id}/fulfillments`                   | Schede/eventi, fasi, quantità, metadati pubblicazione e ultime 50 transizioni |
| `POST /api/ecommerce/staff/orders/{id}/fulfillments/{cardId}/phase`   | Cambia fase o corregge date effettive                                         |
| `POST /api/ecommerce/staff/orders/{id}/workflow`                      | Avvia/sospende/riprende/chiude/riapre l’ordine                                |
| `POST /api/ecommerce/staff/orders/{id}/tracking-content`              | Salva titolo e messaggio cliente di una scheda/evento                         |
| `GET /api/ecommerce/staff/orders/{id}/tracking-publication`           | Stato e contenuti attualmente pubblicati                                      |
| `POST /api/ecommerce/staff/orders/{id}/tracking-publication/preview`  | Ricostruisce l’anteprima della selezione                                      |
| `POST /api/ecommerce/staff/orders/{id}/tracking-publication/publish`  | Approva e salva esattamente l’anteprima                                       |
| `POST /api/ecommerce/staff/orders/{id}/tracking-publication/withdraw` | Ritira con motivo                                                             |

Body principali:

- fase: `{expectedRevision,phase,shippedAt,completedAt,reason,idempotencyKey}`; le date non richieste dalla fase sono `null`;
- ordine: `{action,expectedRevision,reason,idempotencyKey}`, azioni `start/hold/resume/complete/reopen`;
- testi: `{kind,cardId,eventId?,expectedRevision,customerTitle,customerMessage}`, kind `card/event`;
- anteprima: `{workspaceRevision,publicationVersion,selection}`;
- pubblicazione: body anteprima più `{previewHash,idempotencyKey}`;
- ritiro: `{workspaceRevision,publicationVersion,reason,idempotencyKey}`.

Letture/anteprima: `ecommerce.fulfillments.view`. Schede, fasi e testi: `ecommerce.fulfillments.manage`; azioni ordine richiedono anche `ecommerce.orders.manage`. Riapertura: capability amministrativa `ecommerce.orders.reopen`. Pubblicazione/ritiro: `ecommerce.fulfillments.publish`, già riservata a Super/Amministrazione. Commerciale non può pubblicare tramite URL o richiesta diretta.

Sessione Atlas, approvazione e ruolo correnti riletti sul server. Mutazioni con Origin Atlas esatta, JSON, `X-Atlas-Commerce: 1`, body massimo 64 KiB, nessuna query libera. DTO in allowlist, errori sanitizzati, risposte `private, no-store`. Nessuna nuova eccezione OIDC, route pubblica del sito, sessione cliente Atlas o permesso per il cliente sul calendario.

## Persistenza e collaudo

Nuove proprietà compatibili sulle schede, sugli EVENTI e sull’ordine; `commerce_workflow_transitions` è append-only con indice per ordine/data. `commerce_fulfillment_requests` ammette i nuovi tipi operazione. `commerce_tracking_views` conserva soltanto la proiezione approvata e i riferimenti di revisione/hash; in ritiro o modifica viene rimossa. Gli indici mancanti sono inizializzati automaticamente da Atlas, senza script/migrazioni o backfill. Il riferimento dei privilegi Mongo aggiunge al processore la nuova collezione privata, senza nuovi accessi al sito o alle credenziali account. I ruoli reali restano da configurare dall’utente.

Controlli statici dell’agente: parsing/scope dei moduli, regole React Hooks, formattazione, import locali, diff e collegamenti documentali. Non sono compilazione o collaudo dell’applicazione.

Nell’ambiente di prova verificare i tre percorsi fase, quantità parziali su più schede e costi esclusi, ordine sospeso/non pagato, date e cambio d’ora, quantità bloccate dopo spedizione/completamento, chiusura con quantità mancanti/eventi pendenti, riapertura solo amministrativa, annullamento economico concorrente, retry e conflitti di revisione, rollback tra i due DB, titoli cliente mancanti, elementi non selezionati o di altro ordine, note interne assenti dal DTO, hash prima/dopo casting, modifica calendario/testi/fase che ritira la vista, pubblicazione concorrente con modifica, ritiro e ripubblicazione a ordine concluso, dati legacy assenti, ruolo revocato e tentativi di pubblicazione Commerciale. Il percorso API cliente è predisposto al [punto 13](ecommerce-tracking-api.md); il collegamento con il sito e il collaudo dell’utente restano da completare.
