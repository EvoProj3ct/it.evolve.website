# Passo 4 — Categoria E-commerce in Atlas

5 novembre 2026 · Codice predisposto; configurazione e collaudo a carico dell’utente. Nessuna build, test applicativo, connessione ai database o modifica di env reali effettuata dall’agente.

La categoria **E-commerce** è inserita nella configurazione di navigazione di Atlas e viene usata da sidebar e dock. L’area `/ecommerce` riusa Common UI, colori del tema e breadcrumb, con navigazione locale e stati di caricamento, errore e accesso negato.

## Pagine disponibili

Aggiornamento passo 7: in Account del sito è predisposto il pannello **Cliente commerciale**, con associazione a Clienti esistenti, creazione prudente e revisione interna. [Servizi, guardia condivisa, template sito e attivazione](ecommerce-collegamento-clienti.md). Le pagine cliente appartengono al repository sito esterno.

| Percorso                  | Sezione                | Stato in questo passo                                                                                                                                                                                                                                                            |
| ------------------------- | ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/ecommerce`              | Panoramica             | Navigazione delle sezioni consentite, con disponibilità dichiarata; nessun conteggio commerciale simulato                                                                                                                                                                        |
| `/ecommerce/catalogo`     | Catalogo online        | Configuratore, bozza/anteprima/pubblicazione/ritiro predisposti al [passo 5](ecommerce-catalogo-vetrina.md); configurazione e collaudo a carico dell’utente                                                                                                                      |
| `/ecommerce/ordini`       | Ordini                 | [Elenco, dettaglio storico, Cliente e ricavo collegati](ecommerce-ordini-ricavi.md) predisposti al passo 9; [schede consegna ed EVENTI manuali](ecommerce-consegne-eventi.md) dal passo 11; [fasi, pubblicazione e anteprima cliente](ecommerce-gestione-ordine.md) dal passo 12 |
| `/ecommerce/account`      | Account del sito       | Profili verificati e sospensione/ripristino al [passo 6](ecommerce-account-negozio.md); associazioni commerciali al passo 7                                                                                                                                                      |
| `/ecommerce/carrelli`     | Carrelli               | [Consultazione, dettaglio quote e impostazioni consegna/IVA](ecommerce-carrello-riepilogo.md) predisposti al passo 8; impostazioni riservate a Super/Amministrazione                                                                                                             |
| `/ecommerce/pagamenti`    | Pagamenti e rettifiche | [Tentativi, incassi, rimborsi, recuperi e notifiche](ecommerce-pagamenti-stripe.md) predisposti al passo 10, con capability e conferma password nelle azioni                                                                                                                     |
| `/ecommerce/consegne`     | Consegne e lavorazione | [Elenco schede, quantità ed EVENTI manuali](ecommerce-consegne-eventi.md), con gestione dall’ordine e calendario condiviso; fasi operative e pubblicazione/anteprima dal dettaglio ordine                                                                                        |
| `/ecommerce/integrazione` | Integrazione           | Riepilogo della sola presenza delle impostazioni: negozio, identità del sito, dati e responsabile interno                                                                                                                                                                        |

Le pagine di funzioni future sono esplicitamente indicate **in preparazione**. Non mostrano tabelle vuote come se fosse stata letta una collezione, non offrono salvataggi fittizi e non abilitano ordini, incassi, registrazioni o pubblicazioni. La panoramica e il riepilogo delle impostazioni sono funzioni consultabili; questo stato non dichiara operativo il negozio.

Integrazione restituisce soltanto `Da configurare` o `Da verificare`, con descrizioni generiche. Non restituisce URI, ID di progetto, owner, segreti, valori env o password. Non chiama servizi né verifica la connettività. Le impostazioni presenti devono comunque essere corrette e collaudate dall’utente.

La [gestione completa dall’ordine](ecommerce-gestione-ordine.md) applica fasi, quantità, sospensione/chiusura e riapertura amministrativa; pubblicazione e ritiro del tracking sono riservati a Super/Amministrazione, mentre Commerciale prepara testi, selezione e anteprima. Le [API personali Atlas di tracking](ecommerce-tracking-api.md) sono predisposte al passo 13; backend e pagine del sito rimangono da collegare nel repository esterno.

## Accesso e capability

La fonte unica della policy è `src/config/access/ecommerce-access.config.ts`. Menu e schede usano lo stesso catalogo di sezioni; la visibilità del menu non sostituisce il controllo sul server.

| Operazione                                                                                    | Super / Amministrazione                         | Commerciale                        |
| --------------------------------------------------------------------------------------------- | ----------------------------------------------- | ---------------------------------- |
| Panoramica, lettura catalogo/ordini, dati minimi cliente negli ordini, carrelli e lavorazione | Consentita                                      | Consentita                         |
| Elenco globale account verificati e sospensione/ripristino                                    | Predisposta al passo 6, conferma password staff | Negata                             |
| Preparare catalogo, avanzare lavorazione, gestire schede/eventi                               | Implementata nel servizio dedicato              | Implementata nel servizio dedicato |
| Pubblicare catalogo o aggiornamenti destinati al cliente                                      | Capability predisposta                          | Negata                             |
| Risolvere associazioni cliente e sospendere account                                           | Capability predisposta                          | Negata                             |
| Annullare ordini, consultare pagamenti e richiedere rimborsi                                  | Capability predisposta                          | Negata                             |
| Consultare/configurare integrazione                                                           | Consentita / capability di modifica predisposta | Negata                             |

`Tecnico`, `Custcare`, `Agente`, `Cliente` e ruoli sconosciuti non accedono al modulo. Le mutazioni catalogo sono predisposte dal passo 5; sospensione/ripristino account dal passo 6 con conferma password staff. Associazioni e operazioni economiche arrivano nei passi successivi. MFA staff resta da completare prima delle operazioni sensibili in produzione.

Ogni richiesta server verifica la sessione **Atlas NextAuth**, quindi rilegge ID, approvazione e ruolo attuali. Una sessione vecchia non conserva privilegi dopo rimozione approvazione, cancellazione o cambio ruolo. Il guard ordinario non seleziona hash; soltanto la conferma delle azioni account rilegge la password del medesimo operatore. La cache React evita letture duplicate nella stessa richiesta RSC, senza conservare autorizzazioni tra utenti/richieste. La sidebar usa il ruolo della sessione e può richiedere aggiornamento dopo un cambio ruolo, mentre il server applica quello attuale.

Layout protetto e singole pagine eseguono controlli indipendenti, perché App Router può riutilizzare i layout nelle navigazioni. Il layout esterno contiene il confine di errore; quello del gruppo `(workspace)` protegge contenuto e navigazione senza cambiare gli URL. Per ogni futura pagina o API servono anche la propria capability e l’autorizzazione della specifica risorsa.

La sessione del negozio, un account nella collezione commerce, un header con ruolo/ID o il token OIDC del sito non diventano un principal staff. Non è stato aggiunto alcun provider cliente a NextAuth, né alcuna eccezione generale nel middleware. Il canale OIDC `internal/health` rimane distinto.

## API staff predisposta

`GET /api/ecommerce/staff/workspace` restituisce versione, capability e sole sezioni consentite al personale autenticato. Non restituisce dati commerciali, utenti, segreti o stato delle env.

- Senza sessione Atlas: `401` JSON, anche nel middleware, senza redirect HTML per il fetch.
- Utente non approvato, eliminato o senza capability: `403` JSON.
- Verifica dell’utente temporaneamente non disponibile: `503`, senza dettagli del driver.
- Risposte senza cache, con request ID ed errori sanitizzati; solo lettura, nessuna mutazione.

Le pagine senza autenticazione portano al login; gli accessi negati e gli URL sconosciuti usano `notFound()` e uno stato Common UI generico. In risposte già in streaming il framework può mantenere lo status HTTP iniziato: la pagina resta priva di contenuto riservato. Le API danno invece gli status JSON espliciti sopra.

Questo namespace staff non è un proxy per il sito. Le API del sito e il canale interno OIDC hanno guard distinti. I futuri handler staff useranno `requireCommerceStaffApi(capability)` e i futuri server component `requireCommerceStaffPage(capability)`; un parametro del browser non sceglie la capability da applicare.

## Verifica affidata all’utente

Controllare il menu in sidebar e dock con i ruoli ammessi/esclusi; provare gli URL direttamente e le navigazioni senza ricaricamento; verificare il rifiuto delle sessioni cliente/OIDC; rimuovere approvazione o cambiare ruolo mantenendo una vecchia sessione; controllare `401/403/503`, assenza di cache, valori env e hash nel payload; aprire le pagine su mobile e nei temi disponibili. Le sezioni devono rimanere utilizzabili senza aver predisposto il DB commerce: questo passo usa soltanto l’accesso staff Atlas e, per gli amministratori, la presenza locale delle impostazioni.

I passi 5–7 aggiungono catalogo, account/accessi e collegamento commerciale con gli stessi guard staff. La conferma password legge soltanto l’operatore corrente per sospensione/ripristino e decisioni commerciali; il processore non legge credenziali cliente. Catalogo/account richiedono DB commerce predisposto, panoramica/integrazione non lo interrogano. Prossimo sviluppo **8 — carrello e riepilogo**.
