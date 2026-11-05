# Passo 11 — Schede consegna ed EVENTI manuali

5 novembre 2026 · Codice predisposto sul lato Atlas. Nessuna build, compilazione TypeScript, test applicativo, connessione Mongo o modifica di env reali eseguita dall’agente. Collegamenti e collaudo sui due progetti Vercel restano all’utente.

## Uso in Atlas

**E-commerce → Ordini → dettaglio → Lavorazione e consegne** permette di creare e modificare schede per spedizione, ritiro o servizio. Ogni scheda assegna quantità delle righe ordinate; non introduce scorte o movimenti di magazzino. **E-commerce → Consegne e lavorazione** elenca le schede e collega al relativo ordine.

Da ogni scheda si aggiungono manualmente eventi di consegna/esecuzione o avanzamento. Per ogni evento si distinguono titolo, note interne, messaggio cliente in bozza, previsione, stato e data effettiva. Un evento di consegna non annullato può essere scelto come previsione principale della scheda. Sceglierne un altro sostituisce il riferimento, senza eliminare il precedente evento.

Gli eventi sono veri record del modello EVENTI, visibili nel calendario ai ruoli autorizzati. Gli spostamenti nel calendario aggiornano anche la previsione dell’anagrafica quando l’evento è quello principale. Le pagine generiche di visualizzazione/modifica di queste schede ed eventi rimandano alla gestione nell’ordine, così esiste un unico editor del dominio. La creazione generica di eventi invita a scegliere l’ordine; non consente eventi orfani.

**Aggiornamento passo 12:** [gestione completa dall’ordine](ecommerce-gestione-ordine.md) predisposta con fasi operative, quantità evase, sospensione/chiusura/riapertura protette, testi cliente separati, selezione, anteprima e pubblicazione/ritiro. I messaggi restano bozze finché un amministratore non approva la selezione; ogni modifica successiva ritira la proiezione fino a nuova approvazione. Le [API personali Atlas di tracking](ecommerce-tracking-api.md) sono predisposte al passo 13, senza accesso cliente a EVENTI o calendario. Nessuna nuova pagina o route browser del sito viene montata in Atlas. Le regole sotto descrivono la base del passo 11, estesa dalla guida del passo 12.

## Dati e regole

| Risorsa                         | Posizione                                        | Significato                                                                                          |
| ------------------------------- | ------------------------------------------------ | ---------------------------------------------------------------------------------------------------- |
| `consegne-ecommerce`            | DB gestionale, `anagrafiche__consegne-ecommerce` | Anagrafica configurata nel registro Atlas, riferimento Cliente/numero ordine e previsione principale |
| `commerce_fulfillment_links`    | DB commerce privato                              | Collegamento immutabile all’ordine/anagrafica, titolo, modalità, stato, allocazioni e revisione      |
| `consegna_ecommerce`            | DB gestionale, `eventi__consegna_ecommerce`      | Pianificazione manuale di consegna, ritiro o esecuzione servizio                                     |
| `avanzamento_ecommerce`         | DB gestionale, `eventi__avanzamento_ecommerce`   | Aggiornamento manuale della lavorazione                                                              |
| `commerceFulfillment`           | Metadati opzionali dei nuovi EVENTI              | Negozio, ID pubblici di ordine/scheda/evento, revisione, previsione, data effettiva e bozza cliente  |
| `commerce_fulfillment_requests` | DB commerce privato                              | Ricevute append-only per deduplicare creazioni di schede ed eventi                                   |

L’ordine, il Cliente e il collegamento della scheda non sono modificabili tramite il form. Sono ammesse soltanto modalità confermate nell’ordine: servizi su modalità servizio, prodotti fisici su spedizione/ritiro. Le righe di costo consegna non sono assegnabili. Le quantità delle schede attive, sommate, non possono superare quelle ordinate. Limiti: 100 schede e 500 eventi per ordine.

Una scheda è attiva o annullata. Prima di annullarla occorre annullare manualmente i suoi eventi programmati; eventi già completati restano nello storico e impediscono l’annullamento della scheda. Le schede annullate liberano le quantità. Cambiare modalità dopo la creazione di eventi è vietato. Gli ordini completati o annullati non ammettono modifiche di pianificazione in questo passo.

Gli eventi sono programmati, completati o annullati. La data effettiva è obbligatoria solo quando completati, deve seguire la creazione dell’ordine e non essere futura, salvo una tolleranza tecnica di cinque minuti. Registrare un completamento richiede pagamento `paid` senza anomalia da verificare. Un evento concluso conserva stato e previsione; restano correggibili testi e data effettiva di un completamento. Non sono previste cancellazioni fisiche.

Nessun evento è creato da ordine, incasso o cambio di stato: `_autoEvent=null`, attore staff reale, audit nella stessa transazione. Un evento pianificato o completato non aggiorna automaticamente lo stato d’evasione dell’ordine, il ricavo o il pagamento. Dal passo 12 il riepilogo evasione viene calcolato dalle fasi registrate manualmente sulle schede, separate dagli EVENTI.

## Tempi e calendario

Le quantità della scheda diventano storiche quando uno dei suoi eventi viene completato: non possono essere riassegnate o aumentate retroattivamente. Anche su schede annullate, una singola assegnazione non può superare la quantità della riga ordinata.

La previsione distingue tre forme, nel fuso **Europe/Rome**:

- `date`: una data `YYYY-MM-DD`, senza orario promesso; calendario `deadline` all-day a fine giornata locale;
- `instant`: un istante UTC canonico `YYYY-MM-DDTHH:mm:ss.sssZ`, calendario `point`;
- `window`: inizio e fine UTC canonici, fine successiva all’inizio, entro 366 giorni; calendario `interval`.

La data effettiva non viene dedotta dalla previsione. Il form inserisce orari italiani e li converte in UTC: rifiuta ore inesistenti nel cambio d’ora, e per un’ora ripetuta richiede la scelta esplicita UTC+1/UTC+2. Le date senza orario conservano il giorno italiano anche nei passaggi ora solare/legale. Lo spostamento a calendario opera soltanto su eventi programmati di schede attive e richiede la revisione letta; per una previsione di più giorni occorre usare una finestra con orari. Uno spostamento in un’ora ripetuta va eseguito dal form dell’ordine, dove si può scegliere esplicitamente il fuso.

## API staff e writer condiviso

| Metodo / percorso                                                                    | Operazione                                                                   |
| ------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------- |
| `GET /api/ecommerce/staff/fulfillments?cursor=…`                                     | 30 schede per pagina e collegamento all’ordine                               |
| `GET /api/ecommerce/staff/orders/{orderId}/fulfillments`                             | Schede ed eventi dell’ordine                                                 |
| `POST /api/ecommerce/staff/orders/{orderId}/fulfillments`                            | Creazione scheda                                                             |
| `PATCH /api/ecommerce/staff/orders/{orderId}/fulfillments/{cardId}`                  | Modifica scheda                                                              |
| `POST /api/ecommerce/staff/orders/{orderId}/fulfillments/{cardId}/events`            | Creazione evento manuale                                                     |
| `PATCH /api/ecommerce/staff/orders/{orderId}/fulfillments/{cardId}/events/{eventId}` | Modifica evento                                                              |
| `PUT /api/eventi/{type}/{coreEventId}`                                               | Solo spostamento calendario dei due tipi riservati, tramite lo stesso writer |

Gli ID nelle route commerce sono pubblici; il calendario conserva l’ID core del proprio EVENTO. Ogni lookup verifica negozio, ordine e scheda. Capability `ecommerce.fulfillments.view/manage`, consentite a Super/Amministrazione/Commerciale, con sessione Atlas e ruolo/approvazione correnti riletti dal server. Mutazioni: Origin esatta di Atlas, JSON, `X-Atlas-Commerce: 1`, body massimo 64 KiB. Risposte dedicate e letture generiche riservate hanno `private, no-store`. Nessuna eccezione OIDC o accesso cliente ad anagrafiche, EVENTI, calendario o API staff.

Scheda: `{title,mode,status,internalNotes,customerMessage,allocations:[{lineId,quantity}],idempotencyKey}`; in modifica `expectedRevision` sostituisce `idempotencyKey`. Campi testo vuoti ammessi per note/messaggio; modalità `shipping/pickup/service`, stato `active/cancelled`.

Evento: `{type,title,internalNotes,customerMessage,state,expected,actualAt,primary,idempotencyKey}`; in modifica `expectedRevision` sostituisce `idempotencyKey`. `type` è uno dei due tipi riservati; `state` usa i codici EVENTI `programmato/completato/annullato`. `actualAt` è UTC canonico o `null`; `primary` è booleano, ammesso solo per eventi consegna non annullati. `expected` contiene `{kind,date,timeZone}` oppure `{kind,startsAt,endsAt?,timeZone}`.

Calendario: `{expectedRevision,startAt,endAt,allDay}`. Non accetta cambi di titolo, partecipanti, visibilità, ordine, Cliente o messaggi. Gli editor generici non hanno un percorso parallelo di scrittura; anche gli hook dei modelli rifiutano salvataggi/query/bulk dei tre nuovi tipi fuori dal writer transazionale autorizzato.

La guardia sull’ordine serializza modifiche e assegnazioni concorrenti con le operazioni commerciali. Revisioni di scheda/evento impediscono sovrascritture obsolete. Le creazioni hanno ricevute idempotenti per staff/negozio/operazione: stessa chiave e contenuto riusano il risultato; contenuto diverso produce `409`. In caso di esito incerto, ricaricare e ritentare con gli stessi dati/chiave. Anagrafica, binding, EVENTO, previsione e audit condividono la stessa transazione sui due DB e sul medesimo MongoClient.

## Inizializzazione e privilegi

Atlas prepara automaticamente le collezioni e gli indici mancanti prima delle operazioni, come nel [modello di persistenza](ecommerce-modelli-transazioni.md). Nessuno script o migrazione numerata. Campi opzionali e nuovi tipi non richiedono riscritture dei dati esistenti.

Il riferimento `scripts/ecommerce/mongo-privileges.mjs` aggiunge al processore `find/insert/update/createCollection/createIndex/listIndexes` sulle sole tre nuove collezioni core; ricevute private con `find/insert/listIndexes` oltre all’inizializzazione. Nessun `remove`, `collMod` o `dropIndex` aggiunto. La credenziale del sito non riceve nuovi privilegi. I ruoli reali non sono stati applicati dall’agente.

## Collaudo affidato all’utente

Controlli statici eseguiti dall’agente: parsing/scope TypeScript e TSX, sintassi/scope dei moduli JavaScript, regole React Hooks sui due nuovi componenti client, risoluzione degli import locali, formattazione, diff e collegamenti relativi della documentazione. Non sostituiscono la compilazione o il collaudo dell’integrazione.

Verificare creazione e modifica di schede prodotti/servizi, allocazioni parziali e due schede concorrenti sull’ultima quantità; rifiuto di righe costo, righe di altri ordini e modalità non acquistate; doppio clic/retry e chiave riusata con dati diversi; revisione obsoleta; rollback tra binding/anagrafica/EVENTO/audit; evento principale sostituito, annullato e spostato dal calendario; evento non principale spostato senza cambiare la previsione della scheda; data senza ora, finestra e cambi d’ora; completamento senza incasso confermato o con data futura rifiutato; annullamento scheda con eventi attivi rifiutato; accessi diretti, ruolo revocato, Origin errata, proprietà extra e bulk non coordinati; ruolo Mongo sito contro tutte le nuove collezioni; inizializzazione ripetuta/concorrenza di più istanze Vercel. Nessuna automazione di calendario, pubblicazione o invocazione esterna è stata attivata.
