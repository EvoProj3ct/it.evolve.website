# @evolve/ecommerce-server — passi 2–13

Modulo esclusivamente server per collegare **sito di prova → Atlas di prova**, su due progetti Vercel. Non contiene interfaccia Atlas, autenticazione NextAuth del personale o modelli `User`/anagrafiche.

Per l’integrazione completa nel repository esterno seguire il [mandato operativo per l’agente del sito](../../docs/ecommerce-handoff-agente-sito.md): distingue i moduli già disponibili dal trasporto carrello/ordini/pagamenti ancora da implementare e riporta contratti runtime, sicurezza, env e matrice di collaudo.

## Codice disponibile

- `identity`: verifica token OIDC Vercel con algoritmo RS256, issuer e audience fissati dal server, subject, owner, progetto, ambiente, scadenza e durata. Restituisce un principal di servizio, mai un ruolo utente Atlas.
- `client`: operazioni nominate `probe()`, `catalog()`, `product(id)`, `productPage(slug)` verso il canale OIDC Atlas; niente proxy o URL scelti dal browser. HTTPS, origine/audience fisse, timeout, nessun redirect e risposta validata/limitata.
- Risposte JSON uniformi, senza cache, segreti o stack trace.
- Configurazione e connessione Mongo del negozio con URI/env separate, senza fallback alle credenziali Atlas.
- Elenco chiuso delle collezioni negozio e operazioni ammesse; le viste pubblicabili sono di sola lettura e l’inbox pubblica permette solo inserimento. Questi limiti devono essere imposti anche dall’utente Mongo.
- Tipi distinti per principal del servizio e account storefront; nessun ruolo staff ottenibile da un account del negozio.
- `auth`: registrazione/verifica, login, sessioni opache, cookie/CSRF, limiti persistenti, profilo, recupero/cambio credenziali e worker privato email. [Passo 6, configurazione e limiti](../../docs/ecommerce-account-negozio.md).
- `customers`: handler sito del collegamento commerciale, con sessione/CSRF/limiti; client OIDC nominativo `customerLink(principal,{resolve})` e `reconcileCustomers()`. Solo stato minimo al browser. [Passo 7](../../docs/ecommerce-collegamento-clienti.md).
- `assertions`: verifica Atlas delle prove personali Ed25519. `auth.prepareCommerceRequest()` autentica la sessione sul sito e firma percorso/body/versioni per carrello, quote e ordini nominativi. [Passo 8](../../docs/ecommerce-carrello-riepilogo.md), [passo 9](../../docs/ecommerce-ordini-ricavi.md). Nessuna nuova pagina/route del sito nei passi 8–9.
- `tracking`: client server `createTrackingClient({auth,env})`, letture nominate di tracking/timeline/consegna con sessione e attestazione; DTO rigorosi e trasporto OIDC limitato. [API e integrazione del sito](../../docs/ecommerce-tracking-api.md). Nessun accesso Mongo diretto alla vista tracking.
- `persistence`: validazione applicativa Mongoose per identità, carrello, inbox/ricevute e viste pubblicabili; controlli di disponibilità, transazioni, revisioni, deduplicazione e lease. Mongoose è un peer (`^8.15.1`) da dichiarare anche nel sito quando verrà integrato.

## In Atlas

La dipendenza locale è già dichiarata nel manifest e nel lockfile. La route di collegamento è:

`GET /api/ecommerce/internal/health`

Risposta valida: `{"service":"atlas-ecommerce-internal","status":"ok","version":1}`.

È un controllo di identità e collegamento, non di funzionalità del negozio o connessione Mongo. Non crea clienti, account, ordini o ricavi. Dal passo 5 sono ammesse anche le route nominate di catalogo/prodotto/product-pages: ciascun handler verifica sempre OIDC, senza cookie personale/cliente e senza eccezioni generiche nel middleware.

Configurazione in Atlas, indicata anche in `.env.example` alla radice:

| Env                           | Valore da configurare nel tuo progetto                                                      |
| ----------------------------- | ------------------------------------------------------------------------------------------- |
| `ECOMMERCE_SHOP_ID`           | Identificatore stabile del negozio di prova, composto da lettere/numeri/trattino/underscore |
| `ECOMMERCE_OIDC_ISSUER`       | Issuer Vercel esatto del sito, per esempio `https://oidc.vercel.com/il-team`                |
| `ECOMMERCE_INTERNAL_AUDIENCE` | Origine HTTPS di Atlas di prova, senza slash finale, uguale all’audience richiesta dal sito |
| `ECOMMERCE_SITE_SUBJECT`      | Subject esatto del sito di prova: `owner:TEAM:project:PROGETTO:environment:AMBIENTE`        |
| `ECOMMERCE_SITE_PROJECT_ID`   | ID `prj_...` del progetto sito di prova, non quello del sito reale                          |
| `ECOMMERCE_SITE_OWNER_ID`     | Owner ID verificato del progetto sito                                                       |
| `ECOMMERCE_SITE_ENVIRONMENT`  | Ambiente Vercel esatto del chiamante (`production`, `preview`, ecc.)                        |

Un progetto chiamato “sito di prova” può essere distribuito come **Production deployment** da Vercel: in quel caso le claim usano `production`. Il nome funzionale “di prova” non equivale alla claim `preview`. L’isolamento dai progetti reali è imposto anche da issuer, project ID, owner, subject e audience, non dal solo nome dell’ambiente. Un Atlas distribuito come `production` rifiuta una policy che autorizzi preview/development.

Env assenti o non valide producono `503`; credenziali assenti/non valide `401`; richieste con Origin browser o sessione storefront inoltrata sul canale interno `403`. Nessun ripiego su API key, `NEXTAUTH_SECRET`, cookie o credenziali di sviluppo.

## Nel backend del sito

Il repository del sito non è nella cartella di lavoro, quindi non è stato modificato. Il pacchetto è pronto da copiare in `packages/ecommerce-server` del sito e dichiarare nella sua dipendenza locale:

```json
{
  "dependencies": {
    "@evolve/ecommerce-server": "file:packages/ecommerce-server"
  }
}
```

Quando verrà integrato quel repository, la chiamata nel codice **server** sarà:

```ts
import "server-only";
import { atlasCommerceClientFromEnv } from "@evolve/ecommerce-server/client";

export async function verificaCollegamentoAtlas() {
  return atlasCommerceClientFromEnv(process.env).probe();
}
```

Non esportare questa funzione come proxy anonimo generico. Il pacchetto rifiuta importazioni browser tramite un’entry dedicata; le env non devono essere `NEXT_PUBLIC_*`. Le future route cliente avranno controlli sessione/CSRF propri, indipendenti dal canale OIDC.

Usare la `.env.example` di questo pacchetto come elenco delle env server del sito. `ECOMMERCE_ATLAS_ORIGIN` e `ECOMMERCE_INTERNAL_AUDIENCE` devono essere la stessa origine HTTPS di Atlas di prova. L’identità OIDC viene ottenuta dal contesto Vercel del sito, senza salvare manualmente un JWT statico nelle env.

Se il progetto Atlas usa Deployment Protection, l’eventuale `ECOMMERCE_ATLAS_PROTECTION_BYPASS` è un segreto server fornito/configurato dall’utente e viene inviato soltanto nell’header ufficiale Vercel, mai in un URL. Non sostituisce né disattiva la verifica OIDC applicativa. Questo codice non crea segreti Vercel e non modifica le protezioni del progetto.

## Confini del passo

**Aggiornamento passo 10:** il helper di firma ammette avvio e stato pagamento, senza aggiungere pagine/route del sito. Chiavi Stripe e worker finanziario appartengono solo ad Atlas. [Contratto e configurazione](../../docs/ecommerce-pagamenti-stripe.md). Atlas prepara automaticamente collezioni e indici; configurazione e collaudo restano all’utente.

Il passo 5 introduce `@evolve/ecommerce-server/catalog`: factory dei GET pubblici del sito, DTO con allowlist e validazione esatta, chiamate al lettore Atlas che verifica sorgente e pubblicazione. Usare `storefrontCatalogHandlersFromEnv(process.env)`; valida le env dentro il confine degli errori alla richiesta, senza connessioni durante import/build. Gli esempi in `examples/next-app/` vanno copiati nel repository del sito nei percorsi indicati nei file. Il repository esterno non è stato modificato. Non usare lettori diretti delle viste Mongo per il catalogo: non possono rivalidare l’articolo sorgente.

In Atlas: `/ecommerce/catalogo`, `/ecommerce/account`, `/ecommerce/carrelli`, `/ecommerce/ordini` e relative API staff. Per il tracking usare `createTrackingClient({auth: storefrontAuth, env: process.env})`; non leggere `commerce_tracking_views` tramite la credenziale sito. Il processore necessita di `find/update` su Articoli e di permessi sulla guardia core Clienti secondo il riferimento dei privilegi. Per immagini usare i prefissi pubblici `ECOMMERCE_PUBLIC_MEDIA_BASE_URLS`. [Catalogo](../../docs/ecommerce-catalogo-vetrina.md), [identità](../../docs/ecommerce-account-negozio.md), [collegamento](../../docs/ecommerce-collegamento-clienti.md), [carrelli](../../docs/ecommerce-carrello-riepilogo.md), [ordini e ricavi](../../docs/ecommerce-ordini-ricavi.md).

Codice e lockfile sono predisposti. Configurazione reale, deployment e collaudo sono a carico dell’utente, come richiesto. Non sono state eseguite build, test applicativi o chiamate ai server Vercel. L’aggiornamento del lockfile non ha eseguito script di installazione.

Il passo 3 predispone collezioni, indici, connessioni e adapter transazionali. Atlas prepara collezioni e indici mancanti automaticamente; il sito esegue soltanto un controllo di lettura degli indici. Non ci sono script manuali, validator Mongo o blocchi sulla versione del database: [inizializzazione e privilegi](../../docs/ecommerce-modelli-transazioni.md). Il DB commerce è separato dal gestionale sullo stesso cluster; il processore usa una credenziale dedicata e un solo client/sessione per entrambi i DB, senza leggere credenziali account.

Il sito può inserire comandi nell’inbox e leggere ricevute minime di idempotenza, senza leggere payload o aggiornare esiti/lease. `accountAccess` è leggibile e inseribile per l’inizializzazione, ma non aggiornabile/eliminabile dalla credenziale sito: la sospensione staff resta al processore. Le viste ordine/operazione restano di sola lettura. Dal passo 13 la vista tracking non è direttamente leggibile dal sito: usare il lettore personale OIDC che verifica proprietà e approvazione corrente. Dal passo 5 le due viste catalogo non sono direttamente leggibili dalla credenziale del sito: usare le letture OIDC che verificano la sorgente. Applicare il template aggiornato dei privilegi; l’isolamento effettivo non è stato collaudato dall’agente.

Per il codice del sito, `@evolve/ecommerce-server/persistence` espone `connectStorefrontDatabase(mongoose, process.env)`: legge soltanto `ECOMMERCE_MONGODB_URI`/`ECOMMERCE_MONGODB_DB` e attende la verifica degli indici, senza crearli. Gli account non hanno alcun collegamento al login Atlas. I template autenticazione in `examples/next-auth/` vanno copiati nel sito togliendo `.example`. Le API Atlas di acquisto e tracking sono predisposte; route e pagine browser vanno integrate nel repository sito al passo 14.

```ts
import "server-only";
import mongoose from "mongoose";
import { createStorefrontAuth } from "@evolve/ecommerce-server/auth";
export const storefrontAuth = createStorefrontAuth({
  mongoose,
  env: process.env,
});
// Route sito: handleAuth(request, action), handleProfile(request).
// Per carrello/ordini/tracking: prepareCommerceRequest() autentica e firma le route nominate.
// Il client tracking integra questo passaggio automaticamente.
// Invio email: handleMailDelivery(request), soltanto da chiamante privato autorizzato.
```

L’identità usa scrypt Node e Pwned Passwords; le email sono accodate cifrate e richiedono un’invocazione privata del worker. Chiavi/env solo nel sito. Il passo 7 predispone associazione commerciale e revisione staff con job durevoli. I template non aggiungono route cliente in Atlas né un terzo deployment.

Riferimenti tecnici: [OIDC verso una propria API](https://vercel.com/docs/oidc/api), [claim Vercel](https://vercel.com/docs/oidc/reference), [Deployment Protection per chiamate automatiche](https://vercel.com/docs/deployment-protection/methods-to-bypass-deployment-protection/protection-bypass-automation).
