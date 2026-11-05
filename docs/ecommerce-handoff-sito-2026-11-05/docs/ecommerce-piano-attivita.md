# E-commerce — piano delle attività e criteri di completamento

5 novembre 2026 · Sviluppo autorizzato dal passo 2; env, collegamenti Vercel e test gestiti dall’utente.

Riferimenti: [architettura e dati](ecommerce-fase-1.md), [contratto API](ecommerce-api-v1.md), [pagamenti, gestione dall’ordine, consegne e vetrina](ecommerce-pagamenti-consegne-vetrina.md).

## 1. Risultato atteso

Un account cliente si registra e compra sul sito; usa soltanto il negozio. Atlas gestisce il catalogo selezionato, il cliente commerciale, l’ordine aperto, il relativo ricavo e la lavorazione. Le credenziali cliente non permettono accesso al gestionale, alle sue API o ai dati di altri clienti.

Il lavoro è suddiviso in pacchetti. L’utente ha chiesto di procedere sul codice e gestirà direttamente due progetti Vercel di prova, env, collegamenti e test. Il passo 1 non è un prerequisito bloccante per l’agente; sono predisposti i passi 2–13: confini/OIDC, dati/transazioni, workspace staff, catalogo/API vetrina, identità del negozio, collegamento ai Clienti, servizi Atlas per carrelli/riepiloghi e conversione ordine/ricavo, pagamenti Stripe, schede consegna/EVENTI manuali, fasi e pubblicazione con anteprima e API personali di tracking. Build e test applicativi non sono stati eseguiti, né è stato eseguito provisioning sui database.

## Checklist operativa da seguire passo per passo

Questa è la sequenza di esecuzione. I pacchetti E00–E12 descritti dopo rimangono il dettaglio tecnico; la checklist sotto è il registro da usare insieme all’utente. **Passi 2–13: codice predisposto, configurazione e verifica a carico dell’utente. Punto 14: documento di passaggio e pacchetto trasferibile predisposti; integrazione da eseguire nel sito.** I passi 15–16 restano da eseguire. I passi 8–13 riguardano Atlas; integrazione e pagine del sito rimangono nel repository esterno. La predisposizione del codice non equivale a una verifica sui server reali.

Per ogni passo registrare stato (`da iniziare`, `in corso`, `da verificare`, `completato`, `bloccato`), risultato concreto, verifica svolta e questioni ancora aperte. Segnare completato soltanto quando il risultato indicato esiste ed è verificato. Il collaudo conclusivo integra le verifiche dei singoli passi, non rinvia a fine progetto l’autorizzazione e la sicurezza.

| Stato                                    | Passo                                      | Attività operativa                                                                                                                                | Risultato per chiuderlo                                                                                                                                                                                          | Riferimenti |
| ---------------------------------------- | ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| Gestito dall’utente                      | 01 · Assetto e ambiente di prova           | Due progetti Vercel: Atlas di prova e sito di prova; env, collegamenti e test configurati dall’utente                                             | Lo sviluppo non attende queste operazioni; nessun segreto richiesto in chat                                                                                                                                      | E00         |
| Codice predisposto; verifica utente      | 02 · Separazione dei servizi               | Modulo server del sito, canale OIDC interno Atlas, configurazioni distinte e policy delle collezioni                                              | Client `probe()` e route interna health disponibili; credenziali/env reali e verifica effettiva dei ruoli Mongo restano da configurare                                                                           | E01         |
| Codice predisposto; verifica utente      | 03 · Modelli e transazioni                 | Validazione applicativa, indici espliciti, revisioni, audit, inbox/ricevute/outbox, connessioni separate e adapter transazionali                  | [Fondamenta e inizializzazione automatica](ecommerce-modelli-transazioni.md) disponibili; Atlas inizializza gli indici; ruoli e collaudo restano all’utente; orchestrazione ordine al passo 09                   | E02         |
| Codice predisposto; verifica utente      | 04 · Categoria Atlas                       | Categoria E-commerce per sidebar/dock, pagine, capability esplicite, approvazione/ruolo correnti e API staff workspace                            | [Area staff predisposta](ecommerce-workspace-atlas.md); funzioni future indicate in preparazione, integrazione senza valori riservati; collaudo accessi/UI a carico dell’utente                                  | E09         |
| Codice predisposto; verifica utente      | 05 · Configurazione prodotto e API vetrina | Configuratore Atlas, bozza/anteprima/pubblicazione/ritiro, prezzi e IVA espliciti, fingerprint sorgente e API catalogo con OIDC                   | [Codice e collegamento al sito](ecommerce-catalogo-vetrina.md) predisposti; privilegi, env e collaudo a carico dell’utente; route sito da copiare nel repository esterno                                         | E04         |
| Codice predisposto; verifica utente      | 06 · Account esclusivi del negozio         | Registrazione, verifica email, login, sessioni, logout, recupero/cambio credenziali, profilo e sospensione staff                                  | [Identità separata, API/template sito, coda email](ecommerce-account-negozio.md) predisposti; integrazione sito, invocazione worker, env, privilegi e collaudo a carico dell’utente; nessun `User` cliente Atlas | E03         |
| Codice predisposto; verifica utente      | 07 · Collegamento commerciale              | Riuso/creazione prudente, revisione staff, API stato e job identità                                                                               | [Servizi, pannello, template sito](ecommerce-collegamento-clienti.md) predisposti; guardia condivisa con writer ordinari; env/privilegi e collaudo utente                                                        | E05         |
| Codice predisposto; verifica utente      | 08 · Carrello e riepilogo                  | Servizi Atlas, consultazione staff, regole consegna/IVA, quote, attestazioni cliente e antireplay                                                 | [Codice Atlas](ecommerce-carrello-riepilogo.md) predisposti; policy inizialmente disabilitata; privilegi/env e collaudo utente; nessuna pagina sito aggiunta                                                     | E06         |
| Codice predisposto; verifica utente      | 09 · Ordine e ricavo                       | Conferma transazionale idempotente, ordine aperto, ricavo programmato, elenco/dettaglio e API personali                                           | [Codice Atlas](ecommerce-ordini-ricavi.md) predisposti; mappatura esplicita per ricavi misti; privilegi e collaudo utente; nessun incasso o pagina sito                                                          | E07, E09    |
| Codice predisposto; verifica utente      | 10 · Checkout Stripe e incasso             | Checkout ospitato, API protette, webhook durevoli, riconciliazione, incassi, rimborsi e pannello staff                                            | [Codice Atlas](ecommerce-pagamenti-stripe.md) predisposti; Stripe/metodi/env/scheduler e collaudo utente; nessun provider o database reale modificato                                                            | E08         |
| Codice predisposto; verifica utente      | 11 · Schede consegna ed EVENTI             | Anagrafica dedicata, quantità assegnate, eventi manuali e writer condiviso col calendario                                                         | [Servizi e interfaccia Atlas](ecommerce-consegne-eventi.md) predisposti dall’ordine; previsione/data effettiva distinte, indici automatici, privilegi e collaudo utente; bozze cliente non pubblicate            | E09D        |
| Codice predisposto; verifica utente      | 12 · Gestione completa dall’ordine         | Fasi scheda/ordine, quantità evase, sospensione/chiusura/riapertura protette, selezione e testi cliente, pubblicazione/ritiro con anteprima       | [Codice e interfaccia Atlas](ecommerce-gestione-ordine.md) predisposti; revisioni/hash/idempotenza, ritiro delle viste obsolete e cronologia; nessuna API personale di tracking ancora montata                   | E09, E09D   |
| Codice predisposto; verifica utente      | 13 · API tracking riservato                | Riepilogo, timeline paginata e dettaglio consegna con OIDC/attestazione, proprietà account, pubblicazione corrente e limiti                       | [API Atlas e client server](ecommerce-tracking-api.md) predisposti; nessun accesso diretto del sito alla vista Mongo, nessuna pagina/route del sito montata qui; collaudo utente                                 | E09D        |
| Passaggio documentato; sito da integrare | 14 · Collegamento al sito                  | [Mandato operativo per l’agente del sito](ecommerce-handoff-agente-sito.md), pacchetto server e template, contratti e sequenza di implementazione | Archivio trasferibile predisposto; chiusura tecnica dopo integrazione nel repository esterno. Identità su DB commerce con credenziale limitata, nessun DB commerciale duplicato o segreto nel browser            | E10         |
| [ ]                                      | 15 · Collaudo del percorso completo        | Verificare isolamento, concorrenza, errori, recupero, wallet, consegne parziali, permessi, limiti e ripristino                                    | Evidenze del percorso end-to-end e dei casi di rifiuto/guasto, anomalie risolte e revisione sicurezza prima dell’attivazione                                                                                     | E11         |
| [ ]                                      | 16 · Attivazione controllata               | Configurare produzione, callback/webhook reali, pochi prodotti approvati, monitoraggio e procedure di blocco/ripresa                              | Primo percorso reale controllato e servizi osservabili; pagamenti pendenti recuperabili anche durante un blocco dei nuovi acquisti                                                                               | E12         |

**Prossima esecuzione: integrazione nel repository del sito tramite il mandato del punto 14.** Sono predisposti il [documento dettagliato](ecommerce-handoff-agente-sito.md) e l’archivio trasferibile `artifacts/ecommerce-handoff-sito-2026-11-05.zip`, con pacchetto server, template, guide, riferimenti Atlas e hash dei file. Non sono state installate pagine/route del sito in Atlas e il sito esterno non è stato modificato. La consegna documentale non chiude l’integrazione né il collaudo del passo 15. I privilegi effettivi, le env, i due deploy di prova e il collaudo restano all’utente; nessuna connessione o operazione reale effettuata dall’agente.

### Significato di “Checkout ospitato” nella sequenza

Nella proposta attuale il percorso è: **sito (carrello e riepilogo) → pagina di pagamento servita da Stripe → sito (stato dell’ordine)**. Il backend crea una Checkout Session; il cliente apre l’URL Stripe, paga e normalmente torna al sito. La schermata di pagamento può essere personalizzata con gli elementi di branding consentiti, mentre catalogo, area cliente e gestione ordini rimangono quelli progettati per il sito e Atlas.

La conferma dell’incasso arriva tramite una notifica server verificata, anche se il cliente chiude il browser prima del ritorno. Il solo redirect non segna l’ordine come pagato. **L’utente ha confermato la variante ospitata sui server Stripe con redirect**: questa è la modalità da realizzare al passo 10. Fonti: [modalità Checkout](https://docs.stripe.com/payments/checkout), [conferma server](https://docs.stripe.com/checkout/fulfillment.md?ui=full-page).

## 2. Pacchetti di lavoro

| ID   | Pacchetto                                                | Dipendenze                            | Risultato verificabile                                                                                                                          |
| ---- | -------------------------------------------------------- | ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| E00  | Decisioni operative e contratti                          | Progetto attuale                      | Merchant Stripe/PayPal, disponibilità wallet, dati checkout, tariffe consegna, ruoli, ambienti, limiti e versioni API definiti                  |
| E01  | Separazione servizi e accessi                            | E00                                   | API con solo route e-commerce, worker privato, identità e ruoli DB distinti                                                                     |
| E02  | Schemi, indici, adapter e audit                          | E01                                   | Collezioni validate, vincoli univoci e transazioni senza dipendenza da utenti cliente Atlas                                                     |
| E03  | Identità del negozio                                     | E01, E02                              | Registrazione verificata, login, sessioni, reset, cambio email e sospensione indipendenti                                                       |
| E04  | Configurazione prodotto e pubblicazione catalogo/vetrina | E02                                   | Pagina Atlas, sì/no, contenuti, prezzo sorgente/online, IVA, proiezioni pubbliche e invalidazione coerente                                      |
| E05  | Collegamento ai clienti                                  | E02, E03                              | Cliente riusato/creato, casi ambigui in revisione, nessuna assegnazione di accessi Atlas                                                        |
| E06  | Carrello e quote                                         | E03, E04, E05                         | Versioni, prezzi autorevoli, indirizzi e riepilogo con scadenza                                                                                 |
| E07  | Ordine e ricavo                                          | E02, E06                              | Creazione atomica, una sola conversione, vista cliente, outbox e recupero                                                                       |
| E08  | Pagamento Stripe/PayPal/wallet e rettifiche              | E07, verifica merchant                | Checkout ospitato, eventi verificati, riconciliazione, scadenze e rimborsi                                                                      |
| E09D | Consegne, EVENTI e tracking                              | E02, E07                              | Anagrafica consegna, eventi manuali e calendario, collegamenti e proiezione cliente con API dedicate                                            |
| E09  | Workspace E-commerce in Atlas                            | E02; singole funzioni E04–E08 ed E09D | Menu, pagina prodotto e gestione completa di schede/eventi dal dettaglio ordine con anteprima cliente                                           |
| E10  | Integrazione del sito                                    | Contratto stabile, E03–E08, E09D      | Backend sito, identità sul DB commerce con credenziale limitata, vetrina, carrello, checkout e tracking via API, senza DB commerciale duplicato |
| E11  | Collaudo di isolamento e continuità                      | E01–E10                               | Casi positivi/negativi, retry/crash, limiti, backup e verifica di sicurezza indipendente                                                        |
| E12  | Attivazione controllata                                  | E11 e decisioni operative chiuse      | Ambiente produzione segregato, monitoraggio, procedure e rollback verificati                                                                    |

E09 può essere sviluppato per incrementi man mano che esistono i relativi servizi. E10 non inventa contratti in anticipo: il backend del sito usa esclusivamente il contratto versionato e-commerce.

### E00 — Congelare le scelte indispensabili

- Acquisire il repository del sito e identificare dominio, progetti Vercel, sviluppo, preview e produzione.
- Verificare il merchant Stripe e l’attivazione di PayPal/Apple Pay/Google Pay nel checkout ospitato, condizioni senza canone obbligatorio e commissioni effettive; stabilire se sono ammessi metodi con conferma differita. PayPal diretto solo come alternativa progettata, senza doppio circuito automatico.
- Definire dati necessari per privati/aziende, paesi serviti, modalità e costi di consegna/ritiro, esecuzione dei servizi.
- Confermare la policy per prezzi IVA inclusa/esclusa, aliquote, arrotondamento e rettifiche nei ricavi.
- Mappare capability del personale, limiti di importo, retention e soglie operative.
- Produrre OpenAPI definitivo con esempi, schemi rigorosi, header e stati; distinguere sempre protocollo pubblico e messaggi interni.

Fine pacchetto: nessuna scelta irrisolta viene rimpiazzata con un valore presunto nel checkout. Se un flusso, per esempio la consegna, non è configurato, quel tipo di acquisto resta disabilitato.

### E01 — Rendere effettivi i confini

- Usare i due deployment confermati: backend del sito per API negozio, Atlas per servizi interni. Mantenere punti di ingresso, identità, moduli e credenziali distinti; nessuna interfaccia o autenticazione Atlas nel sito.
- Mantenere logica condivisa in moduli di dominio importabili senza pagine/route staff, credenziali globali o dipendenze da `UserModel`.
- Definire regole statiche dei confini di importazione: l’API pubblica non importa NextAuth staff, modelli anagrafici generici, `User`, chiavi Atlas o client Mongo privilegiati.
- Configurare OIDC con audience API e vincoli esatti di progetto/owner/ambiente; identità worker e scheduler separate dal sito.
- Definire ruoli Mongo per azioni e collezioni, con assenza di privilegi ereditati troppo ampi. Non usare il fallback automatico all’URI gestionale nel deployment pubblico.
- Censire endpoint pubblici già presenti in Atlas; eventuale gateway riservato al personale è un’attività infrastrutturale distinta, compatibile con NFC/inviti/webhook intenzionali.

Fine pacchetto dopo configurazione/collaudo dell’utente: con le credenziali del sito una query a utenti/anagrafiche/ricavi è negata dal database; nel progetto sito nessuna pagina o route staff Atlas è distribuita. Stato del codice attuale: [modulo server e collegamento OIDC](../packages/ecommerce-server/README.md), endpoint health senza accesso a dati commerciali. Non dichiarare già verificati i permessi Mongo effettivi.

### E02 — Modellare i dati e l’affidabilità

- Schemi stretti per identità, profili minimi, sessioni, token monouso, associazioni, listing, viste, carrelli, quote, ordini, collegamenti ai ricavi, pagamenti, rettifiche, inbox, risultati, outbox e audit.
- Indici univoci applicati esplicitamente prima di aprire il traffico; non affidarsi a creazione fire-and-forget.
- Versioni per concorrenza, lease dei job, deduplicazione e ricevute idempotenti; evoluzione additiva dei campi con valori predefiniti e inizializzazione automatica di collezioni/indici.
- Adapter interno per creare cliente e ricavo con attore `system/customer/staff/provider` e sessione Mongo. Nessun account Super tecnico utilizzabile come scorciatoia.
- Replica set per i futuri test di transazione, runtime e connessioni compatibili con serverless, limiti di pool e timeout.
- Permessi separati per inbox di richieste pubbliche, inbox staff ed esiti; payload dei messaggi validati anche nel worker.

Fine pacchetto: una transazione fallita non lascia ordine, ricavo o associazione parziali; credenziali pubbliche non possono segnare un comando come completato né inserire comandi di rimborso nella superficie staff.

Stato del codice: [modelli, indici, privilegi e adapter](ecommerce-modelli-transazioni.md) predisposti al passo 3. Il criterio sul rollback del percorso completo sarà verificabile quando i servizi dei passi 7–9 useranno questi strumenti; non è già collaudato. Nessun collegamento Mongo, build o test applicativo è stato eseguito dall’agente.

### E03 — Costruire l’identità separata

- Usare primitive crittografiche mantenute e sessioni opache compatibili con le collezioni dedicate; nessun provider di login cliente aggiunto alla configurazione NextAuth interna.
- Definire normalizzazione email conservativa: niente fusione automatica di alias, rimozione di punti o regole specifiche di provider non concordate.
- Password, verifica email, reset e cambio email; token monouso consumati atomicamente e mai memorizzati in chiaro.
- Cookie e CSRF sul sito, sessioni opache, versioni e revoca; nessun accesso da sessione scaduta anche se il TTL non ha ancora cancellato il record.
- Messaggi uniformi e limiti condivisi prima di hashing/invio email. Email di servizio distinte da marketing; template e link con domini fissi.
- Profilo verificato minimo per il worker; sospensione staff tramite servizio di accesso, senza consultazione di hash password cliente.

Fine pacchetto: stesso indirizzo presente tra staff e clienti identifica due account indipendenti; registrazione/reset del negozio non legge, crea, approva o modifica alcun `User` Atlas.

Stato del passo 6: [codice identità del negozio](ecommerce-account-negozio.md) predisposto con scrypt Node, verifica password compromesse, cookie/CSRF, limiti persistenti, token monouso, email cifrate e accessi staff. Template per il sito esterno; inizializzazione automatica di collezioni/indici, ruoli e collaudo all’utente. Nessun collegamento commerciale prima del passo 7. Formattazione e controllo diff soltanto, senza build/test applicativi o collegamenti ai servizi.

### E04 — Pubblicare un sottoinsieme di prodotti

- Schermata che usa gli articoli Atlas come sorgente e salva la configurazione commerciale dedicata.
- Pagina Atlas di configurazione della futura scheda vetrina: titolo/testi/media, slug, prezzo da anagrafica o dedicato online, bozza/anteprima/pubblicazione e endpoint `product-pages`.
- Campo sì/no, criterio IVA e aliquota per articolo; nessun prezzo o flag precompilato che renda vendibili prodotti storici.
- Compilatore di proiezione pubblica con allowlist di dati e media approvati, anteprima identica al DTO del sito.
- Revisioni, cache e writer coerente per aggiornamenti di prezzo/IVA/abilitazione, anche quando passano da editor generico, import o azioni automatiche.
- Controllo concorrenza tra pubblicazione e checkout; nessuna conferma su articolo ritirato o con prezzo cambiato senza nuova accettazione.

Fine pacchetto: costi, note, allegati e metadati staff non compaiono nella collezione pubblicabile o nelle risposte. L’abilitazione richiede tutti i dati commerciali validi.

Stato del passo 5: [configuratore e API vetrina](ecommerce-catalogo-vetrina.md) predisposti. La lettura pubblica verifica sorgente/proiezioni e ritira quelle incoerenti, anche dopo modifiche legacy o import; non servire direttamente le collezioni di vista. Pubblicazione e future conferme usano fence transazionali. Collezioni e indici inizializzati da Atlas; endpoint del sito forniti come esempi, perché il repository esterno non è disponibile.

### E05 — Associare il cliente commerciale

- Job dopo verifica email e stato `pending/linked/review_required/blocked` dell’associazione.
- Riuso della relazione già esistente; ricerca privata dei candidati e regola conservativa per privati, revisione per aziende/ambiguità.
- Creazione cliente + collegamento nella stessa transazione, deduplicazione concorrente e audit.
- Schermata staff per risolvere i casi con permessi e nuova verifica identità; nessun cambiamento di anagrafica per effetto di un campo del browser.
- Non pubblicare indirizzi o dati preesistenti: i dati del checkout sono forniti/confermati dal cliente e salvati nella copia storica dell’ordine.

Fine pacchetto: relazione commerciale senza alcuna chiave Atlas; due account eventualmente associati allo stesso cliente non leggono i rispettivi ordini.

Stato del passo 7: [collegamento commerciale](ecommerce-collegamento-clienti.md) predisposto con guardia core condivisa, prove di identità, job/ricevute durevoli, decisioni staff dall’account e stato minimo tramite OIDC. Template sito separati; inizializzazione automatica, ruoli e collaudo utente. Nessun Cliente reale creato e nessun deployment eseguito; carrello e quote al passo 8.

### E06 — Carrello e riepilogo autorevole

- Carrello attivo univoco per account/negozio, righe positive intere, limiti espliciti, gestione dei conflitti tra dispositivi.
- Eventuale import della lista locale al login nel repository sito (passo 14), senza fidarsi di prezzi, owner o altri campi.
- Validazione indirizzi/dati fiscali come input commerciale, senza considerarli prova di identità o aggiornare automaticamente clienti storici.
- Motore prezzi netto/lordo con arithmetic controllata, IVA per riga e consegna distinta; quote immutabile con scadenza, versioni e condizioni accettate.
- API personali nominate con OIDC, attestazione della sessione e antireplay; creazione quote transazionale sincrona, senza esporre payload interni o richieste di altri account.

Fine pacchetto: il totale è riproducibile per carrelli misti e quantità multiple; nessun importo inviato dal browser può diventare il totale dell’acquisto.

Stato del passo 8: [servizi Atlas, interfaccia carrelli e configurazione](ecommerce-carrello-riepilogo.md) predisposti. Revisione esplicita dei prodotti, calcolo IVA per riga, fatturazione, scelte spedizione/ritiro/servizio, quote idempotenti e metadati sessione senza hash. Collezioni e indici inizializzati da Atlas, ruoli da configurare dall’utente; policy inizialmente disabilitata. Nessuna pagina sito creata, nessun ordine/ricavo generato. Controlli statici soltanto; configurazione e collaudo all’utente.

### E07 — Ordine e ricavo

- Transazione di conversione quote/carrello, ordine aperto, ricavo programmato, relazione univoca, vista cliente e outbox.
- Righe e dati cliente/fatturazione/consegna congelati; massimo applicativo esplicito, nessun limite di quattro articoli.
- Numero ordine assegnato dal server senza requisiti fiscali inventati; ID pubblici distinti dagli ID tecnici.
- Mapping ricavi con netto/IVA/lordo, categoria/variante configurate e date corrette; nessuna fattura fittizia.
- Stato operativo separato da pagamento ed evasione per riga; mutazioni nominali con versione e audit.

Fine pacchetto: doppio click, retry, chiavi diverse sul medesimo carrello e crash non producono duplicati o ricavi scollegati.

Stato del passo 9: [conferma, ricavo e scheda ordine](ecommerce-ordini-ricavi.md) predisposti in Atlas. Ordine/ricavo/consumo/carrello/ricevuta/vista/outbox/audit sono atomici; API personali con le attestazioni del passo 8, stati separati e ricavi misti espliciti. Inizializzazione automatica; ruoli e collaudo all’utente. Controlli statici svolti, nessuna build/test applicativo/connessione ai servizi. Nessuna pagina sito o integrazione di pagamento in questo passo.

### E08 — Incasso, scadenza e rettifiche

- Adapter provider e checkout ospitato, sola valuta/configurazione ammessa, callback e redirect fissi.
- Realizzare la scelta confermata: Stripe Checkout ospitato con redirect, pagamento una tantum, carte e wallet desiderati abilitati secondo disponibilità reale; registrare separatamente provider e metodo verificato. Nessun Billing/subscription o componente a canone ricorrente richiesto dal flusso.
- Creazione sessione idempotente fuori dalla transazione Mongo; ripresa dei tentativi e recupero di crash dopo chiamata provider.
- Ingresso webhook con verifica firma, body originale, dimensioni e tipo evento; ricevuta durevole prima dell’ack e verifica provider nel worker.
- Merchant/ambiente/importo/valuta/riferimento ordine verificati, deduplicazione tecnica e di business; gestione di eventi fuori ordine.
- Job per ordini in attesa, pagamenti scaduti e webhook mancanti; coda errori e allarmi su discrepanze.
- Cancellazione concorrente alla creazione sessione, pagamento tardivo, rimborsi parziali/totali e dispute; nessun automatismo di evasione su eventi incerti.

Fine pacchetto: solo una conferma verificata del provider registra l’incasso; il redirect non ha autorità. Un rimborso è una rettifica tracciata, non la cancellazione dell’ordine.

Stato del passo 10: [Checkout ospitato, incassi e rimborsi](ecommerce-pagamenti-stripe.md) predisposti su Atlas con SDK ufficiale, merchant/ambiente/API fissati, ricevute durevoli e riconciliazione fuori ordine. Pagamenti e rettifiche hanno UI, capability, nuova conferma password, recuperi e coda errori. Collezioni e indici inizializzati da Atlas; privilegi, env, webhook, scheduler e collaudo all’utente. Nessuna pagina sito, build/test applicativo, installazione, connessione al merchant o movimento reale eseguiti dall’agente.

### E09 — Categoria E-commerce nel gestionale

- Integrare la categoria nella configurazione menu e dock esistenti.
- Panoramica con azioni operative, catalogo, ordini, account sito, carrelli, pagamenti/rettifiche e integrazione.
- Stati vuoti, attesa, errore, permesso negato e operazione in corso coerenti con Common UI.
- Dettaglio ordine con riferimenti alle anagrafiche, copia storica e cronologia, senza modifiche libere a importi o stati pagamento.
- Pannello “Lavorazione e consegne” nel dettaglio ordine: crea/modifica scheda, aggiungi evento manuale, riprogramma, seleziona consegna prevista, aggiorna fase, pubblica/ritira e apri nel calendario. Tutto eseguibile dall’ordine con anteprima esatta della vista cliente.
- Capability applicate sul server, incluso accesso diretto per URL; conferme motivate per operazioni economicamente sensibili, con importo e ordine esatti.
- Password, token, URI Mongo e segreti provider mai consultabili dalla UI staff.

Fine pacchetto: ogni azione disponibile è collegata a un servizio reale e a un diritto effettivo; nessuna pagina descrittiva viene presentata come funzione operativa.

Incremento del passo 4: [categoria e accessi staff](ecommerce-workspace-atlas.md) predisposti. Panoramica, navigazione, riepilogo della presenza delle impostazioni e API workspace sono disponibili nel codice. Le sezioni commerciali sono indicate in preparazione: azioni catalogo/ordine/pagamento/consegna saranno collegate nei rispettivi passi, con controlli server propri. Le capability di modifica dichiarate non abilitano da sole operazioni non implementate.

### E09D — Anagrafica consegne, EVENTI e API di tracking

- Nuovo tipo anagrafica `consegne-ecommerce`, binding tecnico all’ordine dedicato e allocazioni delle righe/quantità, anche parziali.
- Tipi EVENTI `consegna_ecommerce` e `avanzamento_ecommerce`, collegati alla scheda consegna, con tempi e messaggi cliente separati dai dati interni.
- Creazione e pianificazione manuali da utente staff; `_autoEvent=null`, nessuna action automatica da ordine/pagamento/cambio stato nella prima fase.
- Writer condiviso tra dettaglio ordine, editor anagrafiche/eventi e calendario; validazione delle relazioni e aggiornamento coerente di stato, previsione e proiezione.
- Un evento principale per la previsione di ogni scheda; data senza orario, istante e finestra distinti, timezone e ora legale gestiti.
- `StorefrontTrackingView`, pubblicazione/ritiro, API tracking/timeline/dettaglio consegna e autorizzazione per account/ordine.
- Capability staff `ecommerce.fulfillments.manage` e `ecommerce.fulfillments.publish`, senza concedere alcun accesso ad EVENTI o calendario agli account del negozio. La pubblicazione iniziale è riservata a Super/Amministrazione; Commerciale prepara la lavorazione.

Fine pacchetto: il personale gestisce schede ed eventi dall’ordine e li ritrova nel calendario; il cliente vede solo fasi, previsioni ed eventi pubblicati del proprio ordine. Nessun evento pianificato avanza automaticamente lo stato reale o completa la consegna.

Stato del passo 11: [schede consegna ed EVENTI manuali](ecommerce-consegne-eventi.md) predisposti, con gestione iniziale dal dettaglio ordine, elenco dedicato, quantità parziali, revisione/idempotenza e spostamento calendario tramite writer condiviso. Gli editor generici rimandano all’ordine; scritture non coordinate bloccate dai modelli. Previsioni, date effettive e bozze cliente distinte; pubblicazione e tracking sono descritti rispettivamente ai passi 12–13. Nessuna automazione di calendario, accesso cliente a EVENTI o operazione sul database reale.

Stato del passo 12: [gestione completa dall’ordine](ecommerce-gestione-ordine.md) predisposta in Atlas. Fasi e date effettive ricalcolano l’evasione senza modificare pagamenti/ricavi o creare EVENTI. Azioni ordine motivate e riapertura amministrativa, testi cliente separati, selezione positiva e anteprima verificata con hash prima/dopo casting. Pubblicazione riservata, ritiro automatico dei contenuti divenuti obsoleti, ricevute e cronologia append-only. La proiezione approvata è utilizzata dalle API personali del passo 13; nessuna build/test applicativo o connessione reale eseguiti dall’agente.

Stato del passo 13: [API personali di tracking](ecommerce-tracking-api.md) predisposte in Atlas con tre route POST nominate, proprietà account/ordine, sessione e revoche correnti, antireplay, vista approvata/hash/versioni e letture serializzate con il ritiro. Timeline paginata con cursore della pubblicazione, budget per account, DTO rigorosi e client server per il futuro sito. La credenziale sito non legge direttamente la vista tracking. Controlli statici eseguiti; collegamenti, ruoli reali e collaudo restano all’utente. Nessuna nuova pagina o route del sito montata in Atlas.

### E10 — Collegare il sito

- Backend del sito con identità OIDC, sessione cookie e CSRF; client API limitato alle operazioni previste.
- Registrazione, verifica, login e recupero indipendenti da Atlas.
- Catalogo, carrello, quote, ritorno dal provider, stato dell’operazione e area ordini.
- La futura vetrina legge `GET /v1/product-pages/{slug}` senza duplicare contenuti o listino; l’area ordini legge tracking, timeline ed eventuali consegne parziali tramite API dedicate.
- Il ritorno dal pagamento mostra lo stato server, anche se ancora in elaborazione; ripresa dopo timeout senza un secondo acquisto.
- UX per articoli ritirati/prezzi cambiati, collegamento cliente da verificare, sessione scaduta e carrelli concorrenti.
- Moduli e messaggi accessibili, nessun segreto o riferimento interno nell’HTML, JavaScript o storage leggibile dagli script.

Fine pacchetto: il sito funziona senza database proprio e non contiene un proxy generico verso Atlas.

## 3. Matrice minima del collaudo futuro

Questi sono casi da realizzare dopo l’autorizzazione all’implementazione, non test eseguiti in questa fase.

| Caso                                                                       | Esito richiesto                                                                                 |
| -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Account negozio usa credenziali/sessione contro Atlas                      | Nessun accesso UI/API; nessuna sessione staff creata                                            |
| Account staff e negozio con stessa email, reset dal sito                   | Modifica solo account negozio                                                                   |
| Solo token del sito o header con account scelto                            | Nessun accesso personale o impersonificazione                                                   |
| Token OIDC di preview/altro progetto/altro issuer                          | Produzione rifiuta                                                                              |
| Scambio ID account, carrello, quote, operazione o ordine                   | `404` o rifiuto, nessun effetto né dato di altri                                                |
| Due account associati alla stessa azienda                                  | Ordini separati per account, nessuna eredità di autorizzazioni                                  |
| Credenziale DB pubblica legge User/clienti/ricavi/ordini completi          | Rifiuto imposto da Mongo                                                                        |
| API pubblica invia comando staff/rimborso                                  | Inbox/autorità non ammesse; nessun effetto                                                      |
| Campi extra, operatori Mongo, ruoli, prezzi, owner o ID tecnici            | Payload rifiutato, non semplicemente ignorato in modo ambiguo                                   |
| Token verifica/reset scaduto, riusato o consumato due volte                | Nessun secondo effetto                                                                          |
| Account sospeso/sessione revocata con record ancora nel DB                 | Operazioni protette negate immediatamente                                                       |
| Cookie da altro sito senza CSRF / Origin non ammessa                       | Mutazione negata, incluso login                                                                 |
| Più istanze pubbliche sottoposte a richieste eccessive                     | Stesso limite condiviso; nessun bypass per processo                                             |
| Articolo senza flag o configurazione IVA incompleta                        | Non acquistabile                                                                                |
| Prezzo lordo/netto, IVA zero esplicita, quantità multiple e carrello misto | Totali coerenti e riproducibili senza arrotondamenti cumulativi errati                          |
| Disabilitazione/prezzo cambiato durante il checkout                        | Conflitto o nuova conferma secondo revisione, senza incasso inatteso                            |
| Due creazioni cliente concorrenti                                          | Una relazione coerente o revisione; nessun duplicato silenzioso                                 |
| Errore tra scrittura ordine e ricavo                                       | Rollback completo                                                                               |
| Due conferme, chiavi uguali/diverse, crash e retry                         | Un ordine e un ricavo principale per quote/carrello                                             |
| Crash dopo creazione checkout provider                                     | Ripresa stessa sessione o riconciliazione senza secondo addebito                                |
| Redirect “success” inventato                                               | Nessuna registrazione di incasso                                                                |
| Webhook falso, importo/valuta/merchant/ambiente sbagliati                  | Nessun incasso/evasione                                                                         |
| Webhook duplicato/fuori ordine o mancante                                  | Stato riconciliato, nessun doppio effetto o regressione                                         |
| Annullamento mentre viene creata la sessione pagamento                     | Sessione non utilizzabile o riconciliazione controllata                                         |
| Pagamento tardivo dopo annullamento                                        | Verifica staff, nessuna evasione/rimborso non verificati                                        |
| Rimborso ripetuto o superiore al residuo                                   | Rifiuto/deduplicazione; movimenti originari conservati                                          |
| Email, worker o provider indisponibili                                     | Stato recuperabile, coda persistente e allarme                                                  |
| Restore del database con eventi provider più recenti                       | Job riconcilia provider e ordini, senza replicare incassi/ricavi                                |
| Cache, bundle, log e tracing ispezionati                                   | Nessun segreto, dato interno o risposta personale condivisa                                     |
| Wallet non disponibile su dispositivo/browser/merchant                     | Checkout valido con metodi realmente disponibili, senza pulsanti promessi ma non utilizzabili   |
| Prezzo online dedicato o prezzo sorgente, pagina in bozza                  | Vetrina/catalogo/quote coerenti; bozza e dati interni mai pubblicati                            |
| Scheda/evento creato dall’ordine, modificato dal calendario                | Stesso dato e previsione, versioni e vista cliente coerenti                                     |
| Evento interno, riprogrammato, ritirato o futuro                           | Nessuna fuga di dati, nessuna data duplicata incoerente, nessun falso avanzamento/completamento |
| Consegne parziali o riferimento a evento di altro ordine                   | Quantità non superate, riferimenti estranei rifiutati, accessi tra account negati               |
| Ordine pagato o cambio stato con nessuna azione staff                      | Nessuna scheda o evento calendario creato automaticamente                                       |

## 4. Attivazione e recupero

Prima dell’attivazione: ambiente isolato, dati di prova, provider in modalità test e destinatari email controllati; nessuna preview con segreti o dati della produzione. Verificare aggiornamenti dipendenze, contratti, transazioni, confini import/deployment, ruoli DB e revisione di sicurezza indipendente. Il risultato richiesto è evidenza dei controlli, non una dichiarazione generica “API protette”.

Attivare inizialmente pochi articoli esplicitamente selezionati, con parametri reali e verificati. Monitorare errori di associazione, tempi operazioni, ordini senza ricavo, incassi senza ordine aggiornato, outbox bloccate, webhook rifiutati e rimborsi in attesa. Le soglie vengono definite prima del traffico reale.

Prevedere interruttori separati: bloccare nuovi checkout, sospendere un articolo, sospendere account o identità di servizio, fermare la creazione di nuove sessioni provider. Durante un blocco non interrompere ricezione e riconciliazione di pagamenti già avviati. Il rollback dell’interfaccia non deve eliminare dati o far dimenticare operazioni pendenti.

Backup/ripristino e replay degli eventi sono procedure verificate. Nessun rollback automatico di movimenti economici; anomalie irrisolte passano in revisione con audit e responsabilità assegnata.

## 5. Perimetro degli interventi nel repository

Percorsi attuali da integrare in una futura implementazione:

- `src/config/access/*`: categoria interna e mapping delle capability.
- `src/config/anagrafiche.*`: lettura della definizione articolo e riferimenti; eventuali adattamenti necessari senza esporre le anagrafiche al sito.
- `src/config/eventi.*`, `src/config/calendar.config.ts` e servizi EVENTI: tipi consegna/avanzamento, permessi, collegamenti e modifiche manuali coerenti tra ordine e calendario.
- `src/server-utils/service/Anagrafiche/mutations/*`: adapter transazionali, attori e controlli sui cambi dei prodotti pubblicati.
- Nuovo dominio e-commerce: modelli, pricing, stati, servizi interni, repository con connessioni ristrette, worker e contratti pubblici.
- `src/components/AtlasModuli/*`, Common UI e route interne: workspace del personale.
- Nel progetto sito: punti di ingresso delle API negozio senza import di pagine/autenticazione staff. In Atlas: canale server-to-server con route nominate e verifica OIDC; due deployment complessivi come richiesto.
- Repository del sito, ancora da acquisire: backend del sito e percorsi di acquisto.

La scelta di cartelle/package e l’eventuale configurazione workspace verranno definite prima di iniziare il codice, mantenendo i confini sopra. Non è richiesto riscrivere tutto Atlas o migrare gli utenti esistenti.
