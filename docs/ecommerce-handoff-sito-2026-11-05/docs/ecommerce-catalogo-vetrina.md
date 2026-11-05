# Passo 5 — Configuratore prodotto e API vetrina

Codice predisposto in Atlas e nel pacchetto server. L’agente non ha eseguito build, test applicativi, connessioni Mongo, deploy o modifiche di env reali. Il repository del sito non è disponibile: sono fornite route di esempio da copiare nel suo backend Next.js, senza costruire la vetrina grafica.

## Utilizzo in Atlas

Aprire **E-commerce → Catalogo online** (`/ecommerce/catalogo`). “Configura prodotto” ricerca Articoli / Servizi accessibili al profilo e crea una configurazione dedicata, inizialmente non online. La ricerca restituisce soltanto nome, codice, genere e prezzo; nessun costo, nota o allegato interno.

La scheda permette titolo pubblico, slug, descrizione breve, sezioni di testo, immagini pubbliche, prezzo dall’anagrafica oppure dedicato online, criterio IVA incluso/escluso, aliquota esplicita, modalità di evasione e destinazione del futuro ricavo (categoria/variante). La variante va indicata con l’identificatore configurato in Ricavi; prima di creare ordini i passi 8–9 dovranno verificarne anche la compatibilità commerciale. Non sono gestite disponibilità numeriche o quantità in magazzino.

La bozza è salvata separatamente dalla pubblicazione. Non cambia la scheda già online. Il pulsante **Anteprima vetrina** legge la bozza salvata e usa lo stesso compilatore/DTO impiegato dalla pubblicazione e dalle API del sito; revisioni e contenuti sono verificati sul server. La data dell’anteprima indica il momento di compilazione, mentre la pubblicazione registra la propria data effettiva. Il layout del sito rimane da costruire separatamente.

Anche categoria e variante ricavo approvate vengono copiate in una configurazione privata della pubblicazione: una successiva bozza non può cambiare silenziosamente la destinazione contabile del prodotto online. Questa configurazione non compare nelle API vetrina. La guardia per i futuri acquisti restituisce prodotto e mapping ricavo pubblicato soltanto ai servizi interni autorizzati.

**Sì, pubblica online** abilita il prodotto e scrive insieme listing e due proiezioni pubbliche, con identica revisione. **No, ritira dal sito** disabilita la vendita e rimuove entrambe le proiezioni nella stessa transazione. Le operazioni richiedono la versione attesa: un doppio click o una modifica concorrente non sovrascrive una scheda più recente. Slug già pubblicati producono conflitto, senza scritture parziali.

Super e Amministrazione pubblicano/ritirano; Commerciale prepara e visualizza l’anteprima. Ogni handler verifica l’utente Atlas attuale e la capability, applica l’ACL esistente alla sorgente e costruisce un audit con l’attore staff verificato. La nuova pagina ha il controllo server anche se il layout è già protetto.

## Prezzi, immagini e concorrenza

I prezzi sono in centesimi interi, le aliquote in punti base; la conversione da euro/percentuale usa le cifre decimali, senza arrotondamenti impliciti di input. Il prezzo sorgente deve essere finito, non negativo e con massimo due decimali; per pubblicare deve essere maggiore di zero. Il criterio IVA non ha un valore presunto. Il DTO mostra netto, IVA e lordo unitari, ma il futuro riepilogo dovrà calcolare le quantità per riga secondo la policy del progetto.

Per le immagini configurare in **Atlas** `ECOMMERCE_PUBLIC_MEDIA_BASE_URLS`, una lista separata da virgole di prefissi HTTPS di cartelle pubbliche, ciascuno con slash finale. Esempio: `https://cdn.example.com/catalogo/`. Non autorizzare l’intera origine, cartelle private o URL firmati. URL con credenziali, query, fragment o percorsi codificati non sono accettati; nessun download server di URL inseriti nel form. Senza prefissi configurati è possibile pubblicare schede testuali. Le immagini richiedono testo alternativo, dimensioni e conferma esplicita prima della pubblicazione; gli allegati Atlas non vengono copiati. I testi sono strutturati e renderizzati come testo, senza HTML arbitrario.

La pubblicazione registra `publishedSourceHash` separatamente dalla revisione della bozza. Il fingerprint riguarda nome, codice, genere e prezzo dell’articolo, non costi o note. Al momento della pubblicazione una scrittura tecnica sulla sorgente crea un conflitto transazionale con modifiche concorrenti, anche dell’editor generico.

**La lettura pubblica verifica sempre la sorgente attuale e la coerenza delle due proiezioni.** Se l’articolo è cambiato o rimosso, oppure una cartella immagini non è più ammessa, il lettore ritira la vecchia pubblicazione in transazione e non la restituisce. Questo controllo copre anche aggiornamenti da CRUD generico, import o scritture esterne: non richiede di presumere che ogni writer legacy esegua un hook Mongoose. L’invalidazione delle copie memorizzate avviene alla lettura, non nello stesso commit della modifica generica; **i lettori diretti delle collezioni di vista non devono essere usati per servire il sito**. Le sole API fornite passano dal lettore verificato. Le vecchie copie già scaricate da un browser sono fuori dal controllo di questa API.

Le risposte sono `private, no-store`, senza cache applicativa o CDN. Una lettura rappresenta uno snapshot consistente al momento della richiesta; i passi 8–9 devono comunque rivalidare all’acquisto. A questo scopo `lockPublishedCatalogItem()` è predisposto per la futura transazione account: verifica abilitazione, revisione, fingerprint, immagini e proiezioni, e aggiorna le guardie su listing e sorgente. Non espone un checkout e non autentica da solo l’account.

## Route e confini

| Superficie                                   | Route predisposte                                                                                                                           |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Staff Atlas                                  | `GET/POST /api/ecommerce/staff/catalog`, `GET /sources`, `GET/PUT /{id}`, `POST /{id}/preview`, `POST /{id}/publish`, `POST /{id}/withdraw` |
| Canale OIDC sito → Atlas                     | `GET /api/ecommerce/internal/catalog`, `GET /api/ecommerce/internal/catalog/{id}`, `GET /api/ecommerce/internal/product-pages/{slug}`       |
| Backend pubblico del sito, esempi da copiare | `GET /api/ecommerce/v1/catalog`, `GET /api/ecommerce/v1/catalog/{id}`, `GET /api/ecommerce/v1/product-pages/{slug}`                         |

Per le route staff il prefisso delle route relative della tabella è `/api/ecommerce/staff/catalog`. Nessuna mutazione pubblica di listing, disponibilità o prezzi. Le mutazioni staff richiedono sessione Atlas, Origin esatta di `NEXTAUTH_URL`, fetch same-origin quando dichiarato dal browser, JSON, header `X-Atlas-Commerce: 1`, massimo 64 KiB e proprietà esplicitamente ammesse. Non sono CORS aperte e non accettano ruolo, owner o attore dal browser. L’API non interpreta operatori Mongo né campi aggiuntivi come istruzioni.

Il middleware ammette solo gli esatti percorsi del canale OIDC, con ID/slug vincolati; ogni relativo handler verifica sempre l’identità del sito, progetto, owner, audience, ambiente e negozio. Un cookie staff/cliente non sostituisce OIDC. Il sito non sceglie il negozio da un parametro. Il browser chiama il proprio backend e non riceve il token OIDC né il segreto Deployment Protection.

Il client server aggiunge `catalog()`, `product(id)` e `productPage(slug)`, senza proxy libero. Impone HTTPS, origine fissa, timeout, nessun redirect, tipi e dimensione massima della risposta (512 KiB). La validazione esatta del DTO rifiuta campi imprevisti prima di inoltrare i dati al browser. Le liste ammettono solo `limit` (1–50) e `cursor`; la ricerca staff solo testo limitato e cursore. I cursori pubblici sono ID pubblici, mai ID dell’anagrafica.

Il DTO pubblico contiene ID pubblico, slug, codice, nome, tipo, descrizione approvata, prezzo/IVA/lordo unitari, revisione, modalità di evasione, data pubblicazione e immagini approvate. La scheda pagina aggiunge testo strutturato e media. Non esporta `productId`, fingerprint, categoria/variante ricavo, owner, ruoli, draft, guardie, costi, note o allegati.

## Collegamento del repository del sito

Il pacchetto offre `@evolve/ecommerce-server/catalog` con `storefrontCatalogHandlersFromEnv(process.env)`. Gli esempi in `packages/ecommerce-server/examples/next-app/` indicano i percorsi precisi in cui copiarli nel sito. Le env server del sito restano quelle del collegamento OIDC già documentato; per il catalogo non occorre dargli credenziali di lettura delle anagrafiche o delle configurazioni interne.

Il factory valida le env alla richiesta, dentro il confine degli errori sanitizzati, senza collegamenti o segreti richiesti durante import/build. Il client del backend verifica la risposta invece di inoltrare JSON arbitrario da Atlas. La futura pagina vetrina potrà interrogare `/product-pages/{slug}` dal proprio backend o dalla route pubblica del sito. Impaginazione e layout restano a quel repository.

## Dati e inizializzazione

Il catalogo conserva fingerprint sorgente, mappatura del ricavo, revisioni e indici per la pubblicazione. Atlas prepara collezioni e indici mancanti automaticamente. L’aggiunta di campi compatibili non richiede comandi manuali né il ritiro delle pubblicazioni. [Inizializzazione e privilegi](ecommerce-modelli-transazioni.md).

Il processore richiede ora `find/update` su `anagrafiche__articoli`: il nuovo writer scrive soltanto la guardia tecnica e non espone una modifica arbitraria dei campi sorgente. Il template del sito rimuove invece `find` dalle due viste catalogo (restano soltanto i metadati degli indici), perché la lettura deve passare dal reader OIDC che controlla la sorgente. Aggiornare entrambi i ruoli Mongo secondo il template; nessun privilegio su `User` o credenziali account è aggiunto al processore. Le normali pagine staff continuano a verificare la sessione con la connessione Atlas dedicata al personale.

Nessun dato reale è stato pubblicato, ritirato o modificato durante lo sviluppo.

## Collaudo da eseguire nell’ambiente dell’utente

Verificare bozza/anteprima/pubblicazione/ritiro e due modalità IVA; prezzo sorgente e override; conflitti di versione/slug; articolo modificato/rimosso tramite editor e import; cartella immagini revocata; nessuna lettura della bozza dalle API vetrina; rifiuto di cookie cliente/OIDC nelle mutazioni staff e di cookie staff senza OIDC nel canale interno; Origin, body e proprietà extra rifiutati; risposta pubblica senza campi interni; ritiro recepito alla richiesta successiva senza cache; inizializzazione ripetuta/concorrenza e riavvio; layout responsive del configuratore e consegna delle route al sito.

Il [passo 6 — account esclusivi del negozio](ecommerce-account-negozio.md) è predisposto; prossimo sviluppo **7 — collegamento commerciale**. Carrello, ordini, ricavi e incassi non vengono attivati dal configuratore.
