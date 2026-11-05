# Passo 13 — API personali di tracking

5 novembre 2026 · Codice predisposto in Atlas e nel pacchetto server condiviso. Nessuna pagina o route del sito esterno installata nel gestionale. Non sono state eseguite build, compilazione TypeScript, test applicativi, connessioni Mongo/provider, modifiche di env reali o deploy. Configurazione e collaudo sui due progetti Vercel rimangono all’utente.

## Flusso e contenuti

Il personale prepara e approva i contenuti dal dettaglio ordine, come nel [passo 12](ecommerce-gestione-ordine.md). Il backend del sito autentica l’account e chiama le API nominate di Atlas. Il browser usa esclusivamente il proprio sito: nessuna credenziale Mongo, identità OIDC o attestazione personale viene inviata al browser.

Le letture restituiscono soltanto la proiezione già approvata in `commerce_tracking_views`. L’ordine privato viene consultato per verificare proprietà e approvazione; non viene inoltrato al sito. Non vengono interrogate le collezioni core Clienti, Ricavi o EVENTI per costruire la risposta. Note e titoli interni, responsabili, motivi di gestione, riferimenti Mongo, revisioni di lavoro, hash, dati contabili e bozze non fanno parte del contratto.

Un ordine appartiene al suo **account**, oltre che al negozio. Due account collegati allo stesso Cliente Atlas non condividono gli ordini. Un ID consegna o evento pubblicato su un altro ordine non permette l’accesso.

## Route implementate in Atlas

| Metodo e percorso                                                       | Body JSON                               | Risposta                                                                                                   |
| ----------------------------------------------------------------------- | --------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `POST /api/ecommerce/internal/orders/{orderId}/tracking`                | `{principal}`                           | Stato pubblicato, schede selezionate, previsioni/date effettive, righe/quantità e numero eventi pubblicati |
| `POST /api/ecommerce/internal/orders/{orderId}/timeline`                | `{principal,cursor?,deliveryPublicId?}` | Eventi pubblicati, in pagine di 20; filtro opzionale per una consegna selezionata                          |
| `POST /api/ecommerce/internal/orders/{orderId}/deliveries/{deliveryId}` | `{principal}`                           | Una scheda pubblicata e numero dei suoi eventi; gli eventi si leggono dalla timeline filtrata              |

Runtime Node, route dinamiche, durata massima dichiarata 30 secondi. Solo i tre percorsi esatti sono ammessi dal middleware. Non esistono API tracking anonime, GET cliente direttamente verso Atlas, query libere, proiezioni arbitrarie o mutazioni di consegne/EVENTI.

Il backend del sito otterrà il `principal` da `auth.prepareCommerceRequest()`: `{accountId,sessionId,credentialVersion,accessVersion}`. I campi sono firmati assieme a metodo POST del canale interno, percorso esatto, negozio e body. Il browser non sceglie l’account. La richiesta porta `Authorization: Bearer <OIDC Vercel>` e `X-Commerce-Assertion: <attestazione Ed25519>`.

## Risposte e indisponibilità

Le risposte disponibili contengono sempre:

```json
{
  "orderPublicId": "<ID pubblico ordine>",
  "status": "available",
  "publicationVersion": 3,
  "publishedAt": "2026-11-05T10:00:00.000Z"
}
```

A questi campi il riepilogo aggiunge `phase`, `fulfillmentStatus`, `deliveries` ed `eventCount`. La timeline aggiunge `events`, `pageSize:20` e `nextCursor`, stringa oppure `null`. Il dettaglio aggiunge `delivery` ed `eventCount` della scheda. Gli ID negli esempi sono descrittivi; nelle chiamate effettive si usano gli ID pubblici restituiti da Atlas.

Una consegna contiene `publicId,label,mode,phase,lines` e, quando pubblicati/applicabili, `message,expected,shippedAt,completedAt`. Le righe sono `{lineId,title,quantity}`, con titolo storico già confermato nell’ordine. Un evento contiene `publicId,deliveryPublicId,kind,title,status,scheduled` e gli eventuali `text,occurredAt`. Stati evento `planned/completed/cancelled`: la data prevista non implica che l’evento sia già avvenuto. Le previsioni conservano la distinzione tra data senza orario, istante e finestra, con fuso `Europe/Rome`.

Per un ordine proprio senza una vista approvata corrente, riepilogo e timeline non filtrata restituiscono `200` con:

```json
{
  "orderPublicId": "<ID pubblico ordine>",
  "status": "not_available"
}
```

Lo stesso risultato copre mai pubblicato, ritirato, modificato in attesa di nuova approvazione, proiezione assente o incoerente. Non vengono restituiti stato interno di pubblicazione, versione storica, testi o conteggi precedenti. Lo stato pagamenti/ordine resta consultabile con le sue API già previste.

Ordine inesistente o altrui: identico `404 TRACKING_NOT_FOUND`. Dettaglio consegna e timeline filtrata usano lo stesso `404` anche per schede inesistenti, di altro ordine, non selezionate o senza una vista approvata corrente. Questi endpoint non rivelano l’esistenza di bozze o associazioni commerciali.

## Paginazione e consistenza

La timeline usa l’ordinamento approvato nel passo 12: data effettiva se presente, altrimenti previsione, con ID pubblico come spareggio. Non riordina né ricalcola gli EVENTI interni a ogni lettura.

`nextCursor` è un cursore base64url in formato chiuso, massimo 512 caratteri, riferito a ordine, versione pubblicata, filtro consegna e ultimo evento. È un riferimento di pagina, non un segreto o una prova di autorizzazione: ogni chiamata ripete i controlli completi. Non contiene ID Mongo, account o informazioni interne.

Per la pagina successiva inviare il cursore restituito, mantenendo lo stesso `deliveryPublicId` se era presente. Una nuova pubblicazione o un filtro diverso invalida la vecchia pagina: `409 TRACKING_CHANGED`, ripartire senza cursore. Se la vista è stata ritirata, la timeline non filtrata torna `not_available`; non restituisce gli eventi della vecchia versione. Un filtro su consegna segue il comportamento `404` sopra.

Le letture bloccano la guardia dell’ordine nella stessa transazione delle verifiche di accesso e pubblicazione. Pubblicazioni, modifiche, ritiri e letture concorrenti si serializzano: una lettura già in corso può completarsi prima del ritiro; una lettura successiva non recupera la versione ritirata. Le risposte sono `private, no-store`. Il sito dovrà svuotare i dati visualizzati quando riceve `not_available/404` e non conservarli in cache condivise o statiche. Nessuna API può cancellare dati che il cliente ha già ricevuto prima del ritiro.

## Protezioni e limiti

- Identità OIDC vincolata a issuer, audience HTTPS, progetto, owner, subject, ambiente e negozio configurati; cookie, Origin e `X-Storefront-Session` rifiutati sul canale interno.
- Attestazione Ed25519 di 30 secondi, metodo/percorso/body vincolati, nonce antireplay; nessun riuso ammesso come lettura ripetuta.
- Stato corrente di account, verifica, sessione, revoche, versioni credenziali/accesso e sospensione ricontrollati nella transazione; nessun account cliente entra in `User`/NextAuth Atlas.
- Lookup ordine sempre per `shopId + accountId + publicId`, lookup consegna solo nella proiezione approvata del medesimo ordine.
- Approvazione, revisione sorgente, versione pubblicazione, account/negozio, stati e hash della vista verificati dal lettore del passo 12.
- DTO rigorosi e ricostruiti con allowlist su Atlas e sul backend sito; tipi, date, stati, quantità, cardinalità e riferimenti pubblici validati. Nessun inoltro di JSON arbitrario.
- Body massimo 32 KiB, attestazione massima 4096 caratteri, proiezione approvata massima 512 KiB, massimo 100 schede/500 eventi; timeline di 20 eventi. Trasporto sito limitato a 1 MiB anche senza `Content-Length`.
- Budget Atlas di 60 richieste al minuto per account e negozio, condiviso tra i tre endpoint e tra le sessioni; oltre il limite `429 TRACKING_RATE_LIMITED`. Si aggiungono i limiti del login/sessione e delle letture già applicati dal backend sito.

Le letture autenticate verso risorse mancanti o pagine obsolete consumano budget e nonce. Anche una risposta `429` consuma il nonce: per ritentare occorre una nuova attestazione. Un errore transazionale/server non confermato può aver annullato la transazione; il client prepara comunque una nuova attestazione a ogni nuovo tentativo HTTP e non esegue retry automatici.

## Client server pronto per il futuro sito

Il pacchetto espone `@evolve/ecommerce-server/tracking`, protetto dagli import browser. Esempio di modulo **nel backend del sito**, da integrare al passo 14:

```ts
import "server-only";
import { createTrackingClient } from "@evolve/ecommerce-server/tracking";
import { storefrontAuth } from "./storefront-auth";

export const trackingClient = createTrackingClient({
  auth: storefrontAuth,
  env: process.env,
});

// Nei GET autenticati del sito, passando la Request browser originale:
// await trackingClient.tracking(request, orderId);
// await trackingClient.timeline(request, orderId, { cursor, deliveryPublicId });
// await trackingClient.delivery(request, orderId, deliveryId);
```

Il client usa solo queste operazioni nominate, valida gli ID e non accetta URL/liberi, principal o header scelti dal browser. `auth.prepareCommerceRequest()` autentica e limita la sessione del sito, verifica che la richiesta browser sia GET e conforme all’origine, poi firma la chiamata POST interna. Token OIDC ottenuto sul server Vercel, origine/audience Atlas fisse, timeout predefinito 10 secondi e configurabile entro 1–15 secondi, nessun redirect, nessun cookie inoltrato e nessun retry automatico.

Il client verifica anche che ordine, consegna e filtro delle risposte coincidano con la richiesta. Propaga soltanto codici/messaggi d’errore previsti; errori di servizio, infrastruttura o JSON inatteso diventano un errore generico. Usa le env OIDC/Atlas/identità già previste: nessun nuovo segreto di tracking e nessun terzo deployment. Il pacchetto resta JavaScript ESM con dichiarazioni TypeScript per essere eseguito direttamente in Node 20; servizi e route nuovi in Atlas sono TypeScript.

## Mongo e documentazione operativa

Nuova sola collezione privata `commerce_tracking_rate_limits`, con bucket per account/negozio/minuto, indice univoco e TTL. I bucket scadono dopo due minuti dall’inizio della finestra; la cancellazione TTL è pulizia, mentre il limite usa sempre la finestra corrente. Indici e collezione sono inizializzati automaticamente da Atlas; nessuno script, migrazione numerata o backfill. Il processore usa i normali permessi limitati di find/insert/update sulla collezione privata e le stesse transazioni dei due database.

**Il riferimento dei privilegi sito rimuove `find` da `commerce_tracking_views`**, lasciando solo `listIndexes` per il controllo iniziale. Lo stesso divieto è riflesso nell’allowlist del pacchetto. Il tracking va letto tramite le API personali, che verificano la pubblicazione corrente. Se erano stati applicati privilegi precedenti, rimuovere il vecchio grant anziché limitarsi ad aggiungere il nuovo: ruoli ampi/ereditati possono mantenerlo. `scripts/ecommerce/mongo-privileges.mjs` descrive i privilegi senza collegarsi a Mongo o applicarli. Nessun nuovo accesso sito a collezioni core, EVENTI, guardie, bucket o ordini privati.

## Collaudo affidato all’utente

Controlli dell’agente limitati a parsing/scope, React Hooks se coinvolti, formattazione, import locali, diff e link della documentazione. Nessuna compilazione o prova applicativa.

Verificare ordine proprio/altrui/inesistente; due account sullo stesso Cliente; consegna di altro ordine o non selezionata; account sospeso, logout, reset/cambio password e versioni revocate; OIDC di altro progetto/ambiente/negozio; attestazione assente, scaduta, alterata, percorso/body diversi e nonce riusato; cookie e Origin sul canale interno; vista mai pubblicata, ritirata, obsoleta o manomessa; pagina successiva normale, filtro mantenuto, cursore errato o riferito a pubblicazione precedente; ritiro/modifica/pubblicazione concorrenti con la lettura; 60 richieste, 61ª rifiutata, più sessioni concorrenti e ripresa nella finestra successiva; corpo grande, risposta grande/chunked, timeout e redirect; schema extra/campi interni rifiutati dal client; assenza di dati interni nei tre DTO; ruolo sito senza `find` diretto sulla vista tracking. Il collegamento con le route e l’interfaccia del sito è il passo 14.
