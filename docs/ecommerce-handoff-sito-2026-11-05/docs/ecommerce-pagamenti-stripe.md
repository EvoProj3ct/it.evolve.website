# E-commerce — passo 10: Stripe Checkout ospitato e incassi

5 novembre 2026 · Codice predisposto su Atlas. Configurazione, collegamenti e collaudo sui due progetti Vercel sono gestiti dall’utente.

## Ambito realizzato

Atlas prepara un pagamento una tantum per un ordine già confermato, riceve notifiche firmate, rilegge lo stato autorevole su Stripe e registra l’incasso con il ricavo collegato. Offre anche riconciliazione, annullamento dell’ordine non pagato, richieste di rimborso, rettifiche e segnalazione delle contestazioni. Nessuna evasione o creazione automatica di EVENTI deriva dal pagamento.

La pagina di pagamento è servita da Stripe. L’integrazione usa il SDK ufficiale `stripe` **23.1.0**, Node >=20, API fissata a **`2026-10-28.endive`**. Dipendenza e lockfile sono aggiornati dai metadati pubblici npm, senza installare dipendenze o eseguire script. [SDK ufficiale](https://github.com/stripe/stripe-node/tree/v23.1.0), [versione API del SDK](https://github.com/stripe/stripe-node/blob/v23.1.0/src/apiVersion.ts).

Non sono state create pagine o route pubbliche del sito esterno. Il pacchetto condiviso prepara le prove personali per le nuove chiamate; trasporto, vetrina e pagine ritorno rimangono nel repository sito e al passo 14. [Checklist](ecommerce-piano-attivita.md), [ordine/ricavo](ecommerce-ordini-ricavi.md), [carrello](ecommerce-carrello-riepilogo.md), [contratto API](ecommerce-api-v1.md).

## Metodi e importi

Si possono configurare `card`, `paypal` o entrambi, dopo attivazione sul merchant Stripe. Apple Pay e Google Pay vengono riconosciuti come wallet della carta quando offerti e realmente usati. Non sono implementati circuiti PayPal diretti o fallback automatici tra provider. La disponibilità effettiva dipende dal merchant e dal dispositivo: deve essere verificata dall’utente. [PayPal su Stripe](https://docs.stripe.com/payments/paypal), [metodi Checkout](https://docs.stripe.com/payments/checkout/payment-methods), [wallet](https://docs.stripe.com/payments/wallets).

La sessione ha `mode=payment`, interfaccia `hosted_page`, acquisizione automatica e EUR. Non usa subscription, Billing, salvataggio carte o fatture automatiche. Le condizioni economiche del merchant restano quelle del proprio account.

Il totale proviene soltanto dall’ordine congelato. Checkout mostra una riga **Ordine EC-…**, con il lordo complessivo già comprensivo di IVA e modalità di consegna. Il dettaglio per riga rimane in Atlas e nel riepilogo del sito. Questa scelta conserva esattamente gli arrotondamenti per riga del passo 8, anche con IVA mista. Non si attivano Stripe Tax, sconti, promozioni, valuta adattiva, quantità modificabili o nuove spese di consegna nel pagamento. Limiti applicativi del flusso: 0,50–999.999,99 EUR. [Parametri Checkout](https://docs.stripe.com/api/checkout/sessions/create).

## Avvio, ripresa e chiusura

La richiesta cliente presenta un ordine proprio, la revisione corrente e una chiave idempotente. Atlas verifica account/sessione correnti con la prova del passo 8 e acquisisce una guardia sull’ordine. Una transazione prepara tentativo e ricevuta privata; **la chiamata Stripe avviene dopo il commit**, fuori dalle transazioni Mongo.

Un solo tentativo attivo per ordine. Ogni tentativo conserva una chiave Stripe privata, fingerprint dei dati immutabili dell’ordine, merchant/ambiente, metodi, origine di ritorno, versione API e scadenza del recupero. Tutti i parametri di creazione sono riproducibili; non cambiano nei retry. Una chiave cliente riusata con contenuto diverso produce `409 IDEMPOTENCY_CONFLICT`.

Se c’è già un tentativo attivo, una nuova richiesta riusa quello. Dopo una scadenza o un fallimento definitivi, un nuovo tentativo logico richiede una nuova chiave. Pagamenti già incassati, contestati o da verificare non aprono altri checkout. Una sessione chiusa ma ancora in elaborazione conserva il tentativo attivo, impedendo un secondo addebito durante l’attesa.

Il recupero automatico di una creazione dall’esito incerto è limitato a **20 ore**. Oltre questo intervallo Atlas richiede revisione e non ricrea alla cieca una sessione o un rimborso. Il personale può recuperare un oggetto già esistente tramite ID Stripe; proprietà, metadati, importi e riferimenti vengono verificati prima di associarlo. Non è una scorciatoia per creare un nuovo oggetto. Stripe può rimuovere le chiavi idempotenti dopo almeno 24 ore: il limite applicativo resta più breve. [Idempotenza Stripe](https://docs.stripe.com/api/idempotent_requests).

Ogni elaborazione ha un lease con token e scadenza, ricontrollato al commit. Worker concorrenti, scadenza del lease o errori di commit non consentono registrazioni parziali. In caso di creazione mai avviata, l’annullamento può chiudere il tentativo senza chiamare Stripe.

Dopo la chiamata esterna Atlas rivalida la prova della stessa richiesta, la revoca della sessione e lo stato corrente dell’ordine prima di consegnare l’URL. Accetta soltanto URL `https://checkout.stripe.com/c/pay/...`. Non conserva l’URL nel database e non lo espone al personale. Token, cookie, chiavi e client secret non vengono restituiti dal flusso.

## Ritorno al sito

L’origine è l’esatta `ECOMMERCE_ASSERTION_ISSUER` già configurata in Atlas. Percorsi previsti per il futuro sito:

```text
/account/ordini/{orderPublicId}?pagamento=ritorno
/account/ordini/{orderPublicId}?pagamento=interrotto
```

Le pagine non sono state costruite qui. Il parametro di ritorno è solo presentazione: non conferma incassi e non annulla ordini. La pagina dovrà autenticare il cliente, leggere lo stato del proprio ordine e mostrare l’eventuale attesa. Chiusura del browser, ritorno falsificato e refresh non cambiano gli importi o gli stati. Un timeout richiede lettura dello stato o retry con la stessa chiave commerciale e una nuova attestazione, non una nuova vendita. [Conferma server di Checkout](https://docs.stripe.com/checkout/fulfillment.md?ui=full-page).

## Webhook e riconciliazione

Ingresso Atlas: **`POST /api/ecommerce/webhooks/stripe`**. È un’eccezione esatta nel middleware; non è autenticato tramite cookie o NextAuth. Verifica la firma con il SDK ufficiale sul body originale, con limite di 2 MiB e controllo temporale di 300 secondi anche verso il futuro. Rifiuta cookie, Origin, query, ambiente errato, eventi Connect e versione snapshot diversa da quella fissata. Non salva body grezzi o dati carta. [Webhook Stripe](https://docs.stripe.com/webhooks).

La notifica ammessa viene salvata durevolmente con ID provider, tipo, riferimento oggetto, hash e job prima del `200`. La firma non determina da sola un incasso. Il worker rilegge l’evento e gli oggetti correnti attraverso il SDK, con verifica dell’account Stripe atteso; un evento estraneo al negozio non autorizza effetti commerciali.

Tipi da selezionare sul webhook **snapshot**, account proprio, versione `2026-10-28.endive`:

```text
checkout.session.completed
checkout.session.expired
checkout.session.async_payment_succeeded
checkout.session.async_payment_failed
payment_intent.succeeded
payment_intent.processing
payment_intent.payment_failed
payment_intent.canceled
charge.refunded
refund.created
refund.updated
refund.failed
charge.dispute.created
charge.dispute.updated
charge.dispute.closed
charge.dispute.funds_withdrawn
charge.dispute.funds_reinstated
```

Prima di registrare denaro Atlas verifica account/ambiente, sessione, metadati di negozio/ordine/tentativo/fingerprint, riferimento cliente, valuta, lordo, assenza di extra e collegamento PaymentIntent/charge. L’incasso richiede sessione pagata, PaymentIntent riuscito, importo ricevuto corretto e charge pagata/acquisita per intero. Nessun dato del browser o del redirect può sostituire questi controlli.

Il metodo registrato è `card`, `paypal`, `apple_pay` o `google_pay`, derivato dalla charge confermata; nessun numero carta, scadenza, CVC o dettaglio wallet viene memorizzato. Pagamenti parziali o incoerenti vengono bloccati in revisione.

La transazione di registrazione include ricevuta univoca, ricavo `pagato`, data della charge confermata, stato/riepilogo dell’ordine, vista cliente, audit e outbox. Quantità evase e stato operativo non avanzano. Il ricavo viene confrontato con origine, Cliente, mappatura e importi attesi; modifiche manuali incompatibili richiedono verifica e non vengono sovrascritte.

Eventi ripetuti o fuori ordine leggono sempre lo stato corrente. Un vecchio tentativo non pagato non può retrocedere un incasso successivo. Un secondo incasso sullo stesso ordine viene segnalato e non applicato una seconda volta al ricavo. Le anomalie su altri tentativi dello stesso ordine mantengono il blocco anche quando il tentativo principale è valido.

## Annullamenti, rimborsi e contestazioni

L’annullamento è ammesso per un ordine ancora aperto, senza evasione e senza ricevuta di incasso. Richiede revisione, numero ordine, chiave idempotente e password staff. Registra ordine annullato, evasione annullata, ricavo non pagato stornato e richiesta di chiusura dei tentativi attivi. Il checkout esistente viene fatto scadere sul provider; il ritorno `interrotto` da solo non esegue questa azione.

Un incasso concorrente o tardivo su un ordine annullato viene rilevato e registrato come denaro ricevuto, mantenendo l’ordine annullato e il pagamento da verificare. Non avvia consegne o EVENTI. Il personale può gestire un rimborso dopo la verifica.

I rimborsi sono riservati a Super/Amministrazione con `ecommerce.payments.refund`, nuova verifica password e conferma dell’ordine/importo. Si rimborsa esclusivamente il PaymentIntent incassato per quell’ordine; una sola richiesta pendente per ordine e limite sul residuo. Si possono richiedere importi parziali e totali. L’esecuzione è idempotente fuori da Mongo; un SDK timeout conserva richiesta e chiave, senza inventare un esito.

Solo un rimborso rilevato come riuscito sul provider genera una rettifica interna. Atlas crea **un ricavo negativo separato** e una ricevuta univoca nella stessa transazione, mantenendo il ricavo originale pagato. Originale più rettifiche rappresentano il netto incassato; l’ordine espone lordo rimborsato e stato parziale/totale. Non si elimina o riscrive l’acquisto originale. Anche rimborsi avviati dal Dashboard Stripe vengono riconciliati. [Rimborsi Stripe](https://docs.stripe.com/api/refunds/create).

La ripartizione interna imponibile/IVA dei rimborsi parziali è proporzionale ai totali originari, calcolata cumulativamente in centesimi: un rimborso totale inverte esattamente ogni centesimo. Non viene generata una nota di credito fiscale né attribuito il rimborso a specifiche righe restituite. Si contabilizzano al massimo 20 nuove rettifiche per transazione; eventuali restanti vengono programmate per il successivo passaggio. La lista provider è paginata con limite applicativo di 1.000 rimborsi per pagamento, oltre il quale è richiesta revisione.

Contestazioni aperte/perse e anomalie mantengono il pagamento da verificare o contestato. La chiusura viene riletta dal provider; non sono automatizzati invio di prove, accettazione di contestazioni, commissioni o scritture del saldo Stripe. La relativa gestione resta al merchant. Non si emette automaticamente un altro rimborso su un pagamento contestato.

Un incasso aggiuntivo non applicato al ricavo resta in revisione. Se viene restituito integralmente sul provider, Atlas può riconoscere il ritorno completo e programmare una verifica del tentativo principale: non crea una rettifica negativa per un importo che non aveva applicato al ricavo.

## Interfaccia Atlas e permessi

**E-commerce → Pagamenti e rettifiche** (`/ecommerce/pagamenti`), riservato a Super/Amministrazione:

- pagine di 30 tentativi, filtro di stato e coda “Da verificare”, modalità prova/reale e metodo confermato;
- dettaglio con ordine, importi, scadenza, prossima verifica e riferimenti provider;
- richieste di rimborso e ultime 50 rettifiche, con collegamento ai ricavi negativi;
- riconciliazione manuale, recupero di checkout/rimborso già esistenti e annullamento non pagato;
- ultime 30 notifiche in errore, backoff/tentativi e possibilità di rimetterle in coda.

La scheda ordine collega i pagamenti per chi possiede la relativa capability e mostra incasso, rimborsi e necessità di verifica. Il personale Commerciale conserva la lettura dell’ordine senza ricevere accesso alle API di pagamento amministrative.

Lettura: `ecommerce.payments.view`. Riconciliazione/recuperi/riprova eventi: `ecommerce.payments.reconcile`. Rimborsi: `ecommerce.payments.refund`. Annullamento: `ecommerce.orders.cancel`. Le mutazioni richiedono sessione Atlas, ruolo/approvazione correnti, Origin esatta, JSON, `X-Atlas-Commerce: 1` e password corrente verificata con limiti persistenti. La password non è salvata nei comandi o nei log. Il riepilogo Integrazione mostra solo presenza delle env, mai valori o verifica di funzionamento.

## API e worker predisposti

| Percorso Atlas                                             | Requisiti e contenuto                                                                                                           |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `POST /api/ecommerce/internal/orders/{id}/payment-session` | OIDC + attestazione personale; `{principal,expectedRevision,idempotencyKey}`; risposta con stato e URL solo quando utilizzabile |
| `POST /api/ecommerce/internal/orders/{id}/payment-status`  | OIDC + attestazione personale; `{principal}`; stato proprio dal DB, senza nuove chiamate Stripe                                 |
| `POST /api/ecommerce/webhooks/stripe`                      | Firma ufficiale sul body originale; ricevuta durevole prima del successo                                                        |
| `POST /api/ecommerce/internal/payment-jobs`                | Bearer worker dedicato, richiesta senza body/query/cookie/Origin; nessun comando libero                                         |
| `GET /api/ecommerce/staff/payments` e `/{id}`              | Sessione/capability staff; filtri `cursor`, `state`, `order` nella lista                                                        |
| `POST /api/ecommerce/staff/payments/{id}/actions`          | Azione nominativa, capability e password; nessun setter generico di importo/stato                                               |
| `GET /api/ecommerce/staff/payment-events`                  | Ultime notifiche in errore del negozio                                                                                          |
| `POST /api/ecommerce/staff/payment-events/retry`           | Riprova di una ricevuta già verificata e presente, con password/capability                                                      |

La risposta personale contiene `orderPublicId`, `orderRevision`, `paymentStatus`, ID/stato/scadenza del tentativo, `paidMinor`, `refundedMinor`, `checkoutUrl` eventualmente nullo. Esclude ID Mongo, chiavi Stripe, client secret, riferimenti contabili e codici diagnostici interni. Body personali massimo 32 KiB. Ogni tentativo HTTP richiede un’attestazione nuova; la chiave commerciale rimane la stessa per ritentare la stessa operazione. `PAYMENT_BUSY` richiede un nuovo tentativo successivo, non una nuova chiave.

Il helper server condiviso richiede POST browser per `payment-session`, GET browser per `payment-status`. Il browser continua a chiamare soltanto il proprio sito. Le pagine e le route browser effettive rimangono da integrare.

Il worker tratta al massimo un rimborso, una notifica e un tentativo per invocazione, con controllo del budget prima di ogni lavoro. Eventi: lease, backoff e 10 tentativi prima della coda errori. Polling dei tentativi recenti: circa 5 minuti se attivi, giornaliero se conclusi, entro 180 giorni dalla creazione. Webhook e riconciliazione manuale restano applicabili anche dopo. Le letture personali non fanno polling continuo del provider.

**Nessuno scheduler è stato creato o avviato.** L’utente dovrà invocare regolarmente il worker protetto nel proprio ambiente; la ricezione del webhook da sola salva il lavoro, non aggiorna sincronicamente i ricavi. Le operazioni manuali tentano anche l’elaborazione immediata; dopo errori, timeout o chiusura della pagina la richiesta accettata resta recuperabile. L’outbox prepara effetti deduplicati, senza avviare nuovi invii email.

## Env e predisposizione manuale

Solo in Atlas, tutte server-side:

| Env                                | Significato                                                             |
| ---------------------------------- | ----------------------------------------------------------------------- |
| `ECOMMERCE_STRIPE_ENABLED`         | `false` iniziale; `true` abilita nuovi tentativi                        |
| `ECOMMERCE_STRIPE_MODE`            | `test` oppure `live`, coerente con chiave/eventi                        |
| `ECOMMERCE_STRIPE_ACCOUNT_ID`      | Account merchant `acct_…` atteso                                        |
| `ECOMMERCE_STRIPE_SECRET_KEY`      | Chiave Stripe del merchant; preferire permessi limitati alle API usate  |
| `ECOMMERCE_STRIPE_WEBHOOK_SECRET`  | Segreto del webhook snapshot di questo ambiente                         |
| `ECOMMERCE_STRIPE_PAYMENT_METHODS` | `card`, `paypal` oppure `card,paypal`, esplicitamente configurati       |
| `ECOMMERCE_PAYMENTS_WORKER_SECRET` | Bearer dedicato 43–128 caratteri base64url, distinto da NextAuth/Stripe |
| `ECOMMERCE_ASSERTION_ISSUER`       | Origine HTTPS esatta del sito, già prevista al passo 8                  |

Servono lettura account proprio, Checkout Session, PaymentIntent, charge, eventi, rimborsi e contestazioni; creazione/scadenza sessioni e creazione rimborsi. Nessuna chiave va nel backend sito o in `NEXT_PUBLIC_*`. Non cambiare merchant/ambiente mentre restano operazioni da riconciliare con le vecchie credenziali; i due ambienti usano configurazioni e database segregati.

Disabilitare i nuovi pagamenti non interrompe la riconciliazione degli incassi. Un checkout aperto incontrato durante la riconciliazione viene fatto scadere quando i pagamenti sono disabilitati. Nessun nuovo URL viene restituito con il flag disabilitato. Il merchant, i metodi attivati, la disponibilità wallet e i collegamenti non sono stati verificati dall’agente.

Il webhook deve essere raggiungibile da Stripe tramite HTTPS, anche rispetto alla Deployment Protection di Vercel. La configurazione infrastrutturale della relativa eccezione e delle invocazioni worker è a carico dell’utente; non sono stati modificati bypass o protezioni del progetto.

## Dati e inizializzazione

Ricevute private `commerce_payment_requests`, `commerce_payment_receipts`, `commerce_refund_receipts`; metadati di recupero/lease/revisione nei tentativi e rimborsi; riepilogo pagamento su ordine e vista cliente. Ricevute finanziarie, operazioni e rettifiche sono deduplicate da indici univoci.

Atlas inizializza collezioni e indici mancanti prima delle operazioni, senza script manuali o blocchi sulla versione del database. L’aggiunta dei campi non riscrive lo storico. [Inizializzazione e privilegi](ecommerce-modelli-transazioni.md).

Per i dati delle ricevute finanziarie il processore ha solo `find/insert/listIndexes`, oltre ai permessi di inizializzazione sulle collezioni nominate. Il sito non accede alle ricevute finanziarie o ai modelli privati. Nessun nuovo accesso a User, credenziali cliente o calendario; nessun account Super tecnico per registrare movimenti.

## Verifiche lasciate all’utente

Controlli dell’agente limitati a sintassi/scope, formattazione e diff. Non sono state eseguite build, compilazione TypeScript, test applicativi, installazioni, connessioni Mongo/merchant, pagamenti, rimborsi, migrazioni, modifica di env reali o deploy.

| Caso di collaudo                                                     | Risultato atteso                                                             |
| -------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Carte, PayPal, Apple Pay e Google Pay realmente disponibili          | Un’unica pagina Stripe e importo identico all’ordine                         |
| Ritorno falsificato, browser chiuso o callback ripetuta              | Nessuna autorità contabile dal redirect                                      |
| Doppio click, nuove chiavi sullo stesso ordine e retry dopo timeout  | Un solo tentativo attivo e richiesta Stripe idempotente                      |
| Crash prima/dopo creazione Stripe e prima del commit locale          | Recupero dell’oggetto esistente, senza secondo addebito                      |
| Scadenza/fallimento definitivo e pagamento asincrono ancora pendente | Nuovo tentativo solo quando quello precedente non è più pagabile             |
| Firma/body/ambiente/merchant/importo/valuta/metadati alterati        | Rifiuto o revisione senza aggiornare il ricavo                               |
| Eventi duplicati/fuori ordine, webhook mancante e lease scaduto      | Nessuna doppia ricevuta o regressione; recupero da API                       |
| Logout/sospensione durante creazione checkout                        | URL non consegnato alla sessione revocata                                    |
| Annullamento concorrente e incasso tardivo                           | Ordine annullato, denaro rilevato e revisione; nessuna evasione              |
| Ricavo cambiato manualmente o vista/collegamento assenti             | Nessuna sovrascrittura o registrazione parziale                              |
| Rimborsi parziali/totali, concorrenti e dal Dashboard Stripe         | Residuo rispettato, una rettifica per rimborso, inversione totale esatta     |
| Dispute, secondo incasso e rimborso restitutivo del duplicato        | Revisione mantenuta finché l’anomalia non è verificata                       |
| Coda errori, worker non invocato e recupero manuale oltre 20 ore     | Stato pendente/revisione corretto, senza creazioni alla cieca                |
| Accesso cliente/staff e permessi Mongo reali                         | Isolamento, proprietà e capability anche tramite URL diretto                 |
| Inizializzazione ripetuta o concorrente                              | Collezioni e indici pronti prima delle operazioni; dati esistenti preservati |

Il [passo 11](ecommerce-consegne-eventi.md) predispone anagrafica consegne ed EVENTI manuali dal dettaglio ordine; il [passo 12](ecommerce-gestione-ordine.md) predispone fasi operative e pubblicazione con anteprima cliente. Un annullamento o cambio operativo effettuato dai servizi pagamento ritira la proiezione di tracking divenuta obsoleta. Il pagamento non programma automaticamente consegne o calendario.
