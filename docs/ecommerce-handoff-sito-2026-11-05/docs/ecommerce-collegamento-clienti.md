# E-commerce — passo 7: collegamento al Cliente Atlas

5 novembre 2026 · Codice predisposto; env, collegamenti e test applicativi a carico dell’utente. Nessun database, deployment o env reale modificato dall’agente.

## Dove si trova il codice

**Le pagine cliente appartengono al sito esterno.** In questo repository restano il modulo server da trasferire nel sito e il pannello interno Atlas. I file in `packages/ecommerce-server/examples/next-customers/` sono template, con suffisso `.example`, da copiare nei percorsi indicati del repository sito; non sono route pubbliche montate in Atlas. Lo stesso vale per i template di registrazione/login del passo 6. La vetrina sarà costruita separatamente.

In Atlas: servizi privati `src/server-utils/ecommerce/customers/`, nuove route OIDC nominate e pannello **E-commerce → Account del sito → Cliente commerciale**. Nel pacchetto: `@evolve/ecommerce-server/customers`, client server `customerLink()`/`reconcileCustomers()` e handler del sito. Restano due progetti Vercel.

## Regole di associazione

Il processore legge soltanto profilo con email verificata e accesso attivo; non legge hash password, sessioni o collezione credenziali del negozio. L’identità della chiamata personale deriva da `authenticate()` nel backend sito e viene trasmessa sul canale OIDC ammesso. Il processore verifica nuovamente negozio, accessVersion e profilo verificato. Il sito è l’autorità per la sessione cliente; il solo token OIDC non è esposto al browser.

| Caso                                                                                                       | Comportamento                                                                   |
| ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| Collegamento corrente, prove identità e Cliente invariati                                                  | Riutilizza il Cliente collegato                                                 |
| Privato, una corrispondenza, email esatta e nome/tipo coerenti                                             | Riutilizza l’anagrafica, senza aggiornarla                                      |
| Privato, nessuna corrispondenza, nome presente ed email entro il limite Clienti                            | Crea Cliente minimo e collegamento nella stessa transazione                     |
| Azienda, anche senza corrispondenze                                                                        | Revisione interna dell’identità/autorizzazione; nessuna associazione automatica |
| Più corrispondenze, tipo/nome discordanti, email in formato legacy ambiguo                                 | Revisione interna                                                               |
| Email verificata cambiata o vecchia associazione senza prova v4                                            | Revisione interna; nessun ricollegamento implicito                              |
| Dati identificativi del Cliente cambiati, Cliente eliminato o duplicato emerso per associazione automatica | Collegamento non utilizzabile per il checkout, da verificare                    |
| Collegamento bloccato                                                                                      | Rimane bloccato finché il personale conferma una nuova associazione             |

Il confronto del nome normalizza NFC, maiuscole/minuscole e spazi; nessun confronto approssimativo. Le email mantengono punti e alias. La ricerca dei candidati è deliberatamente più ampia del confronto esatto: indirizzi multipli/array legacy o somiglianze fanno preferire una verifica alla creazione automatica di un doppione. Massimo 21 candidati letti; oltre uno, nessuna scelta automatica. L’anagrafica Clienti ha limite email 200 caratteri, mentre l’account ne ammette 254: i casi oltre 200 richiedono gestione interna, senza troncamento dell’indirizzo.

La creazione automatica usa soltanto nome, email verificata e tipo privato; non copia ruoli, autorizzazioni, indirizzi, sconti o dati fiscali da vecchi documenti. Per le aziende lo staff può scegliere un Cliente esistente oppure creare un’anagrafica minima con ragione sociale e dati identificativi verificati. P.IVA/CF digitati non costituiscono prova di possesso: la decisione richiede conferma esplicita del personale.

**Il collegamento non concede accesso ad Atlas né ai documenti storici del Cliente.** Non crea `User`, sessioni NextAuth, ruolo Cliente o chiavi `UserResourceKey`. Più account possono essere associati alla stessa azienda dopo verifica, conservando proprietà separate degli ordini. Nessuna fusione di account, sovrascrittura di Clienti esistenti o copia dei loro indirizzi nel sito.

## Identità, revisioni e futuro checkout

La relazione privata `commerce_customer_links` conserva stato `pending/linked/review_required/blocked`, account, eventuale Cliente, fonte della decisione, attore e prova dell’identità verificata. La prova comprende email, account, tipo e istante di verifica: un cambio A→B→A non riattiva la relazione precedente. La precedente anagrafica rimane un candidato privato per il personale, senza essere comunicata al sito.

Un fingerprint del Cliente comprende nome/ragione sociale, email, tipo, CF e P.IVA. Le modifiche identificative invalidano l’utilizzabilità della relazione; modifiche a note/indirizzi non aggiornano automaticamente copie storiche o dati del sito. Una modifica del nome/telefono nel profilo del negozio non sovrascrive il Cliente Atlas.

Il sito riceve esclusivamente `{status,checkoutReady,message}`. Nessun `customerId`, candidato, codice fiscale, partita IVA, hash interno o spiegazione che riveli quali Clienti esistono. `checkoutReady` indica **il solo prerequisito commerciale**; carrello, ordine e pagamento non sono attivati da questo passo.

Per quote/ordini dei passi 8–9 è predisposto `withLinkedCommerceCustomer(tx, principal, work)`: rilegge accesso/versione, profilo, collegamento e Cliente, controlla le prove, acquisisce le guardie e passa l’ID Cliente al writer privato nella stessa transazione. Il frontend non sceglie l’account o il Cliente. Non sostituire questo controllo con il flag restituito in precedenza al browser.

È un controllo commerciale, non un sostituto dell’autenticazione. I futuri processori di comandi personali dovranno verificare anche autorizzazione e revoca della sessione/comando, compresi reset credenziali e logout, prima degli effetti economici; i job di sola associazione possono invece proseguire dopo la verifica email senza una sessione aperta.

## Concorrenza con Atlas e import

Nel database gestionale viene predisposta la collezione tecnica `commerce_customer_registry`, con un solo documento `customers`. Resolver, creazione e futuri writer ordine acquisiscono questa guardia nella stessa transazione che usa i dati Clienti. Le scritture ordinarie Clienti dei writer comuni e del percorso legacy fanno lo stesso con **il proprio MongoClient/sessione**, senza sostituirli con credenziali più privilegiate.

Sono collegati i tre writer comuni create/update/delete, il percorso legacy `anagraficaQuery` e il reset anagrafiche dell’import. Le normali azioni/import che passano da quei servizi partecipano alla guardia. Hook Mongoose impediscono scritture identificative o cancellazioni Clienti senza questo protocollo; insertMany/bulkWrite e aggiornamenti massivi dei dati Clienti vengono rifiutati quando commerce è configurato. Gli import devono passare dai writer singoli. Gli altri tipi di anagrafica conservano il proprio percorso; senza configurazione commerce il controllo Clienti non viene attivato.

Se il negozio crea per primo un Cliente, una successiva creazione ordinaria con la stessa email di un Cliente proveniente da commerce viene rifiutata con `CUSTOMER_ALREADY_CREATED`: verificare e riutilizzare l’anagrafica. Se il writer ordinario crea per primo, il resolver rilegge i candidati dopo la guardia e riusa o richiede revisione. Le creazioni concorrenti e-commerce hanno anche guardia per email e origine univoca per account/email. Cliente, collegamento, audit e ricevuta del job vengono confermati o annullati insieme.

Non viene imposto un vincolo globale di unicità email alle anagrafiche storiche: duplicati già esistenti vengono preservati e richiedono revisione. Anche i flussi ordinari possono conservare i casi aziendali già ammessi; il resolver non li sceglie arbitrariamente. Il pannello commerce non crea un ulteriore Cliente se trova già una corrispondenza esatta, ma permette al personale di scegliere quella corretta.

La garanzia riguarda i writer applicativi coordinati. **Scritture dirette tramite driver, shell Mongo o altri servizi non partecipano agli hook**: fermare il traffico del negozio per manutenzioni/import esterni e usare il protocollo condiviso. Non si promette serializzazione rispetto a modifiche che lo aggirano. La guardia globale privilegia coerenza su questa prima versione e serializza le operazioni coinvolte: collaudare il volume atteso prima dell’attivazione.

## Elaborazione dopo verifica email

Gli eventi durevoli `account_verified`/`email_changed` vengono pianificati in `commerce_identity_jobs`, deduplicati per evento. Si usa un anti-join, non un cursore temporale: commit tardivi non vengono saltati. Ogni invocazione pianifica fino a 20 eventi e processa fino a 10 job. Lease 30 secondi, massimo 10 tentativi, backoff fino a un’ora; account non disponibile rinviato di un’ora. Errori non bloccano la pianificazione degli eventi successivi. Esiti esauriti restano `dead` per diagnosi.

Il completamento salva la ricevuta append-only `commerce_identity_receipts` nella stessa transazione dell’associazione. Crash prima del commit → nessuna associazione parziale; crash dopo il commit → ricevuta e job impediscono un secondo effetto. Lease perso → rollback del completamento. Il worker rilegge il profilo corrente: l’evento è un segnale, non una copia di identità da fidare ciecamente.

Il template privato del **sito** `POST /api/internal/customer-identities` richiede il Bearer dedicato `ECOMMERCE_CUSTOMER_SYNC_SECRET`, senza Origin/cookie browser; richiama il worker Atlas mediante OIDC. Configurare l’invocazione privata e monitorare `{planned,processed,deferred,failed}`; nessuna schedulazione è stata creata. Non è necessario un terzo server Vercel. Nessuna elaborazione affidata a promise in background dopo la risposta di registrazione.

Il POST personale di preparazione del profilo può risolvere l’associazione immediatamente ed è idempotente per account/identità. Serve anche dopo ripristino di un account rimasto sospeso a lungo o per un job esaurito; il personale può intervenire dal pannello. Nessun nuovo job viene duplicato per forzare retry di un evento già pianificato.

## Pannello Atlas

Da **Account del sito → Cliente commerciale** il personale Super/Amministrazione consulta profilo verificato, associazione attuale/precedente e candidati; può cercare altre anagrafiche per nome/email, con massimo 20 risultati mostrati. Vengono mostrati solo i dati identificativi utili alla verifica, senza password o documenti storici.

Azioni: collegare il Cliente selezionato, creare un Cliente se manca una corrispondenza esatta, rivalutare i casi automatici oppure bloccare il collegamento. Un blocco o un cambio identità non si risolve automaticamente con la rivalutazione. Collegamento/creazione richiedono la conferma della verifica d’identità e, per aziende, dell’autorizzazione commerciale. Ogni decisione richiede motivazione, password Atlas corrente, controllo di origine/header staff e capability `ecommerce.customers.resolve`; lettura anche `ecommerce.accounts.view`. Commerciale non accede all’elenco globale degli account né a queste decisioni.

La richiesta porta revisione attesa del collegamento, prova del profilo e, nella selezione di un Cliente, fingerprint del candidato. Dati cambiati nel frattempo → `409`, ricaricamento e nuova conferma. Il blocco commerciale è distinto dalla sospensione dell’accesso: un account attivo può consultare il sito pur non essendo ammesso al checkout. Il requisito progettuale di MFA staff resta da completare prima delle operazioni sensibili in produzione; qui è usata la conferma password già introdotta nel passo 6.

## API e template

| Superficie                 | Percorso                                                  | Controlli / risposta                                                                                                         |
| -------------------------- | --------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Sito, GET                  | `/api/ecommerce/v1/me/customer-link`                      | Sessione negozio corrente, limiti; solo stato minimo                                                                         |
| Sito, POST                 | Stesso percorso, body `{}`                                | Sessione, CSRF/Origin/JSON e limiti; prepara/riusa o richiede revisione; nessun ID scelto dal client                         |
| Sito, worker privato POST  | `/api/internal/customer-identities`                       | Bearer dedicato, nessun Origin/cookie; statistiche senza dati personali                                                      |
| Atlas, POST interno        | `/api/ecommerce/internal/customer-link`                   | OIDC ammesso, body `{accountId,accessVersion}` costruito dal backend, header operazione `read/resolve`; nessun cookie/Origin |
| Atlas, worker POST interno | `/api/ecommerce/internal/customer-identities/reconcile`   | OIDC ammesso, body `{}`; pianificazione/elaborazione limitata                                                                |
| Atlas staff, GET/POST      | `/api/ecommerce/staff/accounts/{profileId}/customer-link` | Sessione staff/capability; GET con `q` facoltativo; POST con decisione, prove/revisione e nuova verifica password            |

Le due route interne sono eccezioni **esatte** nel middleware e verificano sempre OIDC nei propri handler. Non c’è un proxy generico o un’API pubblica che accetti comandi staff. Tutte le risposte sono `private, no-store`, con errori sanitizzati. Il client del sito valida l’allowlist del risultato invece di inoltrare JSON arbitrario da Atlas. Credenziali/cookie staff e cliente non vengono inoltrati al canale OIDC; sono ora rifiutati anche cookie presenti accidentalmente in una chiamata interna.

## Dati e attivazione nel proprio ambiente

Collezioni private di job/ricevute, prove di associazione e guardia delle revisioni del collegamento; singleton tecnico nel DB gestionale. Nessuna collezione Cliente o User viene duplicata.

1. Configurare i ruoli Mongo secondo `scripts/ecommerce/mongo-privileges.mjs`, che esporta documenti senza applicarli. Il sito non accede a Clienti o collezioni private. Atlas inizializza le sole collezioni e gli indici nominati: [funzionamento e permessi](ecommerce-modelli-transazioni.md).
2. La credenziale Atlas ordinaria richiede `find/insert/update/createCollection` sulla guardia Clienti, se il ruolo core non li comprende già. `atlasCustomerRegistryPrivileges(coreDb)` elenca questi permessi, senza accessi aggiuntivi al DB commerce. Anche i writer ordinari preparano automaticamente la guardia prima della transazione.
3. Trasferire i template nel repository sito, dichiarare il pacchetto locale e configurare solo lì `ECOMMERCE_CUSTOMER_SYNC_SECRET`, distinto da chiavi auth/email/NextAuth. Configurare l’invocazione privata del worker. Restano necessarie le env OIDC/DB/responsabile; nessun valore effettivo è stato richiesto o modificato in chat.
4. Aprire una pagina dati E-commerce in Atlas prima dell’uso del sito, così Atlas prepara gli indici. Nessun comando di migrazione e nessuna riscrittura dei Clienti esistenti.

## Verifiche da eseguire dall’utente

Provare riuso privato coerente, nuovo Cliente, azienda senza candidati, duplicati, nomi/tipi discordanti, email legacy/oltre 200 caratteri; risoluzione staff e rifiuto senza capability/password/evidenza; due resolver/worker concorrenti, crash e lease scaduto; creazione/import ordinari concorrenti con l’automatismo e rifiuto di bulk non coordinati; rollback Cliente+link+audit; cambio email A→B→A, modifica/eliminazione Cliente, sospensione/ripristino e blocco commerciale; assenza di ID/dati storici nelle API sito; tentativi di scegliere account/Cliente o chiamare Atlas con cookie; ruolo Mongo sito contro Clienti e collezioni private; inizializzazione ripetuta e riavvio.

L’agente esegue soltanto formattazione/parser, lint statico e controllo diff, senza build, compilazione TypeScript, test applicativi o connessioni ai servizi. Il prossimo sviluppo è **passo 8: carrello e riepilogo**.
