# E-commerce — pagamenti, gestione dall’ordine, consegne e vetrina

**Stato del passo 11:** [schede consegna ed EVENTI manuali](ecommerce-consegne-eventi.md) predisposti in Atlas, con gestione iniziale dall’ordine, quantità assegnate e calendario condiviso. Il [passo 12](ecommerce-gestione-ordine.md) predispone fasi complessive e pubblicazione/ritiro con anteprima. Le [API personali Atlas di tracking](ecommerce-tracking-api.md) sono predisposte al passo 13; il sito esterno va collegato al passo 14. Questo documento conserva il progetto del percorso completo.

3 novembre 2026 · Progettazione, nessuna implementazione o attivazione.

Estende [architettura](ecommerce-fase-1.md), [contratto API](ecommerce-api-v1.md) e [piano attività](ecommerce-piano-attivita.md) con le richieste su Stripe/PayPal/wallet, consegne manuali, EVENTI e configurazione della futura vetrina.

## 1. Pagamento: proposta concreta

**Scelta confermata dall’utente: checkout ospitato sui server Stripe, con redirect dal sito, e carte, PayPal, Apple Pay e Google Pay abilitati quando disponibili per il merchant e il cliente.** Stripe è il processore; Apple Pay, Google Pay e PayPal sono metodi scelti dal cliente. Non occorrono quattro backend di pagamento indipendenti.

La disponibilità va verificata sul conto reale. La documentazione Stripe include l’Italia per PayPal e prevede l’attivazione collegando il conto PayPal. Apple Pay e Google Pay sono supportati nel checkout Stripe; i pulsanti dipendono da dispositivo, browser, wallet e configurazione. Non promettere di mostrarli sempre a ogni visitatore. Fonti: [PayPal su Stripe](https://docs.stripe.com/payments/paypal), [attivazione PayPal](https://docs.stripe.com/payments/paypal/activate), [Apple Pay](https://docs.stripe.com/apple-pay.md?platform=web), [Google Pay](https://docs.stripe.com/google-pay?platform=web).

PayPal diretto resta un’alternativa di integrazione, se il collegamento tramite Stripe non fosse utilizzabile o se si preferisse la gestione diretta. Non attivarlo come fallback automatico durante un pagamento in corso: un ordine deve avere un solo tentativo attivo, con annullamento/riconciliazione del precedente prima di passare a un altro circuito.

### Canoni e commissioni

Situazione verificata il 3 novembre 2026, offerte standard pubbliche per l’Italia:

| Opzione                             | Canone obbligatorio per l’integrazione proposta                          | Commissioni e precisazioni                                                                                                             |
| ----------------------------------- | ------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------- |
| Stripe Payments + Checkout standard | Nessun canone mensile obbligatorio                                       | Pagamento a consumo; esempio carte SEE standard: 1,5% + 0,25 euro. Altre carte/metodi e operazioni hanno tariffe proprie               |
| PayPal Checkout diretto             | Nessun canone mensile/di attivazione obbligatorio                        | Esempio PayPal nazionale standard: 3,4% + 0,35 euro. Non presumere che questa sia la tariffa totale di PayPal elaborato tramite Stripe |
| Apple Pay tramite Stripe            | Nessun abbonamento Apple Pay separato richiesto dalla soluzione proposta | Restano le commissioni del processore; il flusso ospitato evita un’integrazione wallet autonoma                                        |
| Google Pay tramite Stripe           | Nessun abbonamento Google Pay separato                                   | Google non aggiunge una tariffa per la sua API di pagamento; restano le commissioni del processore                                     |

Fonti dei costi: [Stripe Italia](https://stripe.com/it/pricing), [PayPal Checkout](https://www.paypal.com/it/business/accept-payments/checkout), [tariffe PayPal](https://www.paypal.com/it/business/fees), [Google Pay FAQ](https://developers.google.com/pay/api/faq). I prezzi sono indicativi per le condizioni descritte e vanno ricontrollati sul merchant prima dell’attivazione. Non servono Stripe Billing o abbonamenti cliente: sessione in modalità pagamento una tantum. Evitare componenti opzionali a pagamento ricorrente, per esempio il dominio personalizzato del checkout, se l’obiettivo è non avere canoni del provider.

L’assenza di un canone del processore non elimina commissioni, eventuali costi di cambio/contestazioni, hosting o servizi applicativi. Non sottrarre la commissione dal valore commerciale dell’ordine: il ricavo rappresenta la vendita; commissione e netto accreditato sono dati distinti del pagamento.

### Flusso sicuro

1. Il sito chiede una quote e conferma l’ordine; importo e IVA vengono calcolati internamente da Atlas.
2. Il servizio interno crea ordine e ricavo programmato con idempotenza e transazione.
3. Dopo il commit crea la Checkout Session Stripe con importi congelati, `mode=payment` e chiave idempotente. Il sito riceve un URL valido del provider.
4. Il cliente paga nel checkout ospitato. Dati carta e autenticazione del wallet sono gestiti dal provider; Atlas e sito non raccolgono numero carta o CVC.
5. La notifica provider viene verificata, salvata e riconciliata. Solo dopo conferma valida si segnano pagamento e ricavo come incassati. Il ritorno del browser non conferma l’incasso.
6. L’ordine rimane aperto per lavorazione e consegna. Nessun evento calendario viene creato per effetto del pagamento.

3D Secure e gli eventuali passaggi di autenticazione sono gestiti dal flusso del provider. Non salvare metodi per addebiti futuri, non creare subscription e non abilitare rinnovi nella prima versione. I rimborsi seguono il pagamento originario e i permessi staff già progettati.

Nel modello separare `provider=stripe` da `paymentMethod=card/paypal/apple_pay/google_pay`. Quest’ultimo deriva dai dati verificati del provider, non da un campo del browser; se non ancora noto rimane indeterminato. Distinguere `saleGrossCents`, `processingFeeCents` quando disponibile e `payoutNetCents`, senza confondere il netto fiscale della vendita con il netto accreditato.

## 2. La scheda ordine è il centro operativo

Il personale gestisce lavorazione, schede consegna ed eventi **direttamente dal dettaglio dell’ordine**. Le liste anagrafiche e il calendario sono viste collegate dello stesso dato, non passaggi obbligatori per completare l’operazione.

Struttura proposta del dettaglio:

| Area                       | Contenuti / azioni                                                                                    |
| -------------------------- | ----------------------------------------------------------------------------------------------------- |
| Testata                    | Numero ordine, cliente commerciale, pagamento, fase attuale, prossima consegna, operazioni da seguire |
| Righe e importi            | Prodotti/servizi acquistati, quantità, dati storici, assegnazione alle schede di evasione             |
| **Lavorazione e consegne** | Schede collegate, eventi, fasi, calendario, previsione di consegna e pubblicazione al cliente         |
| **Vista cliente**          | Anteprima esatta dello stato, delle date e degli eventi che le API mostreranno sul sito               |
| Pagamenti e ricavo         | Tentativi, incasso verificato, riferimento al ricavo, rettifiche autorizzate                          |
| Cronologia interna         | Audit, note staff e versioni, separati dalla timeline pubblica                                        |

### Pannello “Lavorazione e consegne”

Un riepilogo mostra fase attuale, quantità ancora da evadere, date previste pubblicate e aggiornamenti non ancora visibili al cliente. Seguono le schede consegna, ognuna con stato, righe assegnate, appuntamento previsto ed eventi. Nessun obbligo di cambiare pagina per aggiungere un evento.

Azioni principali:

- **Nuova scheda di lavorazione/consegna:** apre un pannello con ordine e righe già nel contesto, modalità, destinatario e dati necessari. La conferma crea manualmente l’anagrafica e il collegamento tecnico.
- **Apri/modifica scheda:** editor canonico dell’anagrafica nel pannello dell’ordine; i collegamenti non possono essere cambiati con un ID libero.
- **Aggiorna fase:** propone fase, data effettiva e messaggio; l’operatore sceglie esplicitamente se registrare/pubblicare il relativo evento. Stato, evento eventualmente confermato e viste si aggiornano coerentemente.
- **Aggiungi evento:** compositore inline con scheda collegata, tipo, data/orario o finestra, fase, stato e contenuti per il cliente. L’evento viene creato soltanto dopo il salvataggio dell’operatore.
- **Usa come consegna prevista:** identifica esplicitamente l’evento che governa la previsione di quella scheda; non si deduce dalla data dell’ultimo evento inserito.
- **Riprogramma:** cambia data/finestra dell’evento selezionato con versione e motivo; se già pubblicato, il comando rende esplicito che aggiornerà anche il cliente.
- **Apri nel calendario:** porta allo stesso EVENTO; gli spostamenti da calendario usano il medesimo servizio di modifica.
- **Pubblica / ritira dalla vista cliente:** aggiorna la proiezione pubblica senza cambiare i permessi interni dell’evento.
- **Segna consegnata / servizio completato:** richiede righe/quantità e data effettiva; un eventuale evento viene confermato nel dialogo, senza crearlo come automazione nascosta.
- **Anteprima cliente:** mostra la stessa struttura di dati che userà il sito, con indicazione di cosa è ancora privato.

Nella prima fase sono azioni manuali: nessuna action di Atlas genera schede o appuntamenti all’arrivo dell’ordine, al pagamento o al cambio stato. Le code che aggiornano le viste pubblicabili sono sincronizzazione tecnica dei comandi dell’operatore e non pianificazione automatica di nuove attività.

Errori e attese devono essere visibili nel contesto dell’ordine. Un salvataggio fallito non può lasciare un evento sul calendario senza scheda, oppure comunicare al cliente una data non salvata. Il personale vede quale contenuto è pubblicato, chi lo ha modificato e quando.

## 3. Anagrafica di gestione consegna

Nuovo tipo proposto: **`consegne-ecommerce`**, nella struttura anagrafiche Atlas. Può rappresentare una consegna fisica, un ritiro o l’evasione di un servizio; l’etichetta UI nella scheda ordine può essere “Scheda di lavorazione/consegna”.

| Informazione                    | Regola                                                                                                                                                     |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Numero scheda                   | Assegnato internamente, distinto dal numero ordine                                                                                                         |
| Ordine e cliente                | Riferimenti contestuali validati dal servizio, non selezionati dal cliente del sito                                                                        |
| Modalità                        | Spedizione, consegna diretta, ritiro, esecuzione servizio                                                                                                  |
| Righe e quantità assegnate      | Collegamento strutturato; una riga può essere evasa con più consegne senza superare la quantità acquistata                                                 |
| Fase e stato                    | Da programmare, in lavorazione/preparazione, pronta, affidata al corriere, in consegna, consegnata o servizio completato, sospesa/annullata secondo flusso |
| Destinatario e indirizzo        | Copia dei dati dell’ordine; correzioni staff tracciate, nessuna modifica implicita del cliente storico                                                     |
| Responsabile e note interne     | Riservati al personale                                                                                                                                     |
| Messaggio cliente               | Campo distinto dalle note interne, pubblicabile esplicitamente                                                                                             |
| Corriere / riferimento tracking | Facoltativi e inseriti manualmente nella prima fase; URL costruito da template ammessi, non URL arbitrario                                                 |
| Previsione                      | Derivata dall’EVENTO previsto principale, senza due date modificabili indipendenti                                                                         |
| Data effettiva                  | Inserita quando la consegna/fornitura è realmente completata                                                                                               |

Un ordine può avere più schede, utile per consegne parziali o servizi associati a prodotti. Nella prima versione una scheda riguarda un solo ordine. Le quantità assegnate/consegnate hanno vincoli di concorrenza e non sono giacenze di magazzino.

L’ordine e-commerce è un modello dedicato, non un’anagrafica generica già esistente. Perciò il legame vive in **`StorefrontFulfillmentLink`**: `shopId`, `orderId`, `deliveryAnagraficaId`, `allocations[{orderLineId,quantity}]`, `primaryPlannedEventId`, versione e audit. La UI risolve l’ordine attraverso il servizio dedicato; non inventa uno slug anagrafica ordini inesistente.

Le anagrafiche consegna restano protette dalle ACL Atlas. Collegarvi un account del sito non lo rende un utente Atlas e non crea chiavi o accessi alle API anagrafiche.

## 4. EVENTI e calendario esistenti

La lettura del codice conferma che EVENTI dispone già di `startAt`, `endAt`, `allDay`, `timeKind`, partecipanti anagrafici, owner e metadato `_autoEvent`. Si riusa questo sistema.

Due tipi proposti:

| Tipo EVENTO             | Uso                                                                                                            | Collegamento                                              |
| ----------------------- | -------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| `consegna_ecommerce`    | Consegna prevista, appuntamento di ritiro o intervento di servizio                                             | Un partecipante obbligatorio di tipo `consegne-ecommerce` |
| `avanzamento_ecommerce` | Inizio lavorazione, preparazione, pronto, affidamento al corriere, consegna effettiva o completamento servizio | La stessa scheda di lavorazione/consegna                  |

Consentire inizialmente `point` e `interval`, anche all-day se coerente; niente ricorrenze per questi tipi. Ogni evento è creato da un utente staff e ha `_autoEvent=null`. Nessuna configurazione `actions` automatica viene aggiunta per questi flussi nella prima versione.

Campi configurabili proposti: titolo interno, descrizione interna, stato, fase, titolo cliente, messaggio cliente, pubblicazione cliente, eventuale data effettiva. Il catalogo campi EVENTI attuale non include booleani: la pubblicazione può usare inizialmente una select esplicita `si/no`, con assenza equivalente a privato e conversione rigorosa nella proiezione. L’eventuale estensione del tipo boolean è una scelta implementativa, non una capacità già presente.

`visibilityRole` resta un controllo interno Atlas; non deve essere usato per concedere visibilità agli account del negozio. “Visibile al cliente” è una policy distinta, legata al proprietario dell’ordine e ai soli campi pubblici.

La previsione di consegna ha un solo riferimento autorevole all’evento scelto per ciascuna scheda. Può essere una data senza orario, un istante o una finestra; l’API distingue questi casi senza inventare un orario a mezzanotte. Timezone esplicito, inizialmente `Europe/Rome`, conversioni corrette per ora legale. Una previsione non equivale a consegna effettuata o data garantita.

Spostare l’evento dal calendario aggiorna quella stessa previsione. Creare un altro evento non sostituisce automaticamente quello principale. La consegna effettiva richiede un’azione staff e una data reale; non si deduce dal semplice trascorrere della data prevista.

Stato corrente della scheda, stato delle righe, evento eventualmente registrato e proiezione cliente sono aggiornati dal medesimo servizio con versioni/transazioni dove necessario. Un evento pianificato nel futuro non fa avanzare la lavorazione oggi; pubblicare un messaggio non modifica un pagamento. Le correzioni conservano audit e versioni.

## 5. Tracking riservato al cliente

L’API legge **`StorefrontTrackingView`**, una proiezione dedicata per `shopId + accountId + orderPublicId`, senza accesso a `eventi__*` o alle anagrafiche consegna complete.

Contenuti ammessi:

- Fase di lavorazione attuale e stato dell’ordine per il cliente.
- Righe e quantità ancora in lavorazione, pronte o completate, con consegne parziali distinte.
- Consegne con ID pubblico, modalità, stato, previsione pubblicata e data effettiva se presente.
- Tutti gli eventi **pubblicati e relativi a quell’ordine**, con paginazione: titolo cliente, messaggio cliente, fase, stato, data/finestra pianificata o data effettiva, aggiornamento.
- Messaggi pubblici su ritardi/riprogrammazioni, ultimo aggiornamento e revisione della vista.

Non esporre eventi interni non pubblicati, altri appuntamenti, note, owner, partecipanti, responsabili, allegati generici, audit staff o dati di altri clienti. La visibilità non si deduce da una coincidenza sul `customerId` commerciale.

Route aggiuntive proposte, montate nel backend del sito sotto `/api/ecommerce`, sempre con sessione dell’account proprietario. Il successivo canale interno verso Atlas usa l’identità OIDC del sito, non un token richiesto al browser:

- `GET /v1/orders/{orderPublicId}/tracking`: riepilogo lavorazione, consegne e previsioni.
- `GET /v1/orders/{orderPublicId}/timeline`: tutti gli eventi pubblicati, cursor e limiti.
- `GET /v1/orders/{orderPublicId}/deliveries/{deliveryPublicId}`: dettaglio pubblico della singola consegna.

Esempio di finestra prevista, non dati reali:

```json
{
  "orderId": "ord_public_id",
  "phase": "in_lavorazione",
  "deliveries": [
    {
      "id": "del_public_id",
      "status": "programmata",
      "expected": {
        "kind": "date",
        "date": "2026-11-20",
        "timeZone": "Europe/Rome",
        "isEstimate": true
      },
      "deliveredAt": null
    }
  ],
  "revision": 4
}
```

Lo stato di esempio è compatibile con lavorazione in corso e consegna già programmata. Per una finestra temporale si usano `kind=window` e inizio/fine; per data ancora da fissare `expected=null`, non una data fittizia. Eventi futuri sono dichiarati programmati, non presentati come attività già avvenute.

Tutte queste risposte sono private e senza cache condivisa. Il ritiro dalla visibilità cliente aggiorna/rimuove la proiezione con la stessa garanzia di consistenza del salvataggio: non può dipendere soltanto da un job che lascerebbe il contenuto riservato ancora leggibile. Nessun link anonimo al tracking nella prima versione.

## 6. Pagina Atlas di configurazione prodotto per la vetrina

La pagina staff configura un **listing** collegato a un articolo/servizio già esistente. La vetrina del sito sarà costruita separatamente; questa fase definisce dati e chiamate, non il frontend pubblico.

| Sezione della pagina Atlas | Campi / comportamento                                                                                                                              |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Articolo di origine        | Ricerca articolo/servizio, codice e informazioni originali, riferimento stabile                                                                    |
| Pubblicazione              | Vendibile online sì/no, stato bozza/pubblicato, slug pubblico univoco per negozio                                                                  |
| Contenuti                  | Titolo pubblico, descrizione breve, descrizione estesa strutturata, caratteristiche, immagini approvate, testi informativi per acquisto/esecuzione |
| Prezzo                     | Da anagrafica oppure prezzo online dedicato; importo, IVA inclusa/esclusa, aliquota, anteprima netto/IVA/lordo                                     |
| Evasione                   | Prodotto fisico/servizio, modalità ammesse e informazioni pubbliche sui tempi; nessuna pianificazione automatica                                   |
| Presentazione              | Campi SEO e sezioni pubbliche consentite; niente codice arbitrario eseguito dal sito                                                               |
| Anteprima                  | Gli stessi dati del futuro endpoint vetrina, inclusi prezzo lordo e contenuti pubblicati                                                           |

Azioni: salva bozza, anteprima, pubblica modifiche, ritira dalla vendita, copia riferimento API/slug. La bozza non cambia il sito; la pubblicazione incrementa la revisione. La sola presenza di una pagina vetrina non autorizza la vendita se il prodotto è disabilitato o incompleto.

Il prezzo online dedicato non modifica il prezzo unitario dell’anagrafica. Se si usa il prezzo sorgente, i cambiamenti della sorgente passano dalla politica di invalidazione/pubblicazione e dalla nuova conferma al checkout. Catalogo, pagina vetrina e quote derivano dallo stesso prezzo autorevole e dalla stessa revisione pubblicata.

I contenuti sono dati strutturati/validati; nessun blob arbitrario che il sito trasforma in HTML o componenti eseguibili. Media approvati con URL controllati; non si pubblicano gli allegati interni dell’articolo. Il testo sui tempi non è una data prevista per un ordine specifico.

Route logica proposta: **`GET /v1/product-pages/{slug}`**, montata nel sito come `/api/ecommerce/v1/product-pages/{slug}`. Il backend legge la proiezione autorizzata; l’eventuale chiamata interna ad Atlas usa OIDC del servizio senza passarlo al browser. Restituisce soltanto la versione pubblicata: ID prodotto pubblico, slug, titolo, sezioni, media, prezzo, modalità di evasione, stato acquistabile e revisione. Non richiede un account cliente per mostrare una scheda pubblica; autenticazione cliente necessaria solo per dati personali e acquisto.

La pagina del sito sceglierà il layout e visualizzerà questo contenuto. L’acquisto userà `productPublicId`; un prezzo modificato dal JavaScript o dalla pagina non può sostituire quello della quote.

## 7. Estensioni del piano e del collaudo

Attività aggiuntive: anagrafica consegne, legami ordine/righe, due tipi EVENTI e relativi permessi, editor integrati nel dettaglio ordine, writer calendario condiviso, proiezione tracking, tre route cliente e vista pagina prodotto. Le future integrazioni corriere e le automazioni di pianificazione rimangono fuori dalla prima fase.

Collaudo da prevedere nell’implementazione: più consegne/servizi per ordine, quantità parziali senza superamento, timezone e date senza ora, nessun avanzamento da eventi futuri, riprogrammazione da ordine e calendario coerente, pubblicazione/ritiro immediati, dati di altri ordini sempre esclusi, prezzo vetrina uguale a quello autorevole, bozza non pubblicata, wallet non disponibile gestito senza promesse false, nessun secondo addebito passando tra tentativi/provider.

La policy predisposta al passo 4 usa `ecommerce.fulfillments.manage` per Super, Amministrazione e Commerciale, e `ecommerce.fulfillments.publish` per Super e Amministrazione. Autorizzazione della specifica risorsa e audit sono applicati nei servizi dei passi 11–12; fasi e pubblicazione usano revisioni, ricevute e transazioni. Pubblicazione del catalogo e rimborsi conservano i diritti più restrittivi già previsti. [Policy e stato del workspace](ecommerce-workspace-atlas.md).
