# Passaggio ecommerce Atlas al sito

Questo archivio serve all’agente AI che lavora nel repository del sito esterno. Contiene il mandato operativo del punto 14 e i file necessari per implementarlo, nello stato del workspace Atlas del 5 novembre 2026. Il sito non è stato modificato da questo repository.

## Da dove iniziare

1. Estrai l’intero archivio conservando la struttura delle cartelle.
2. Apri [il mandato dettagliato](docs/ecommerce-handoff-agente-sito.md) e leggilo prima di implementare.
3. Consulta `snapshot.json` per origine, versione e perimetro della consegna. I file ecommerce comprendono modifiche locali: il solo commit indicato non ricostruisce questo stato.
4. Usa `manifest-sha256.json` per confrontare gli hash SHA-256 dei file trasferiti. Il manifest comprende tutti i file dell’archivio escluso se stesso.
5. Lavora nel repository del sito, applicando le sue istruzioni e conservando il design esistente. Il pacchetto si installa come dipendenza locale: non è pubblicato su npm.

## Cartelle

| Percorso                                | Uso                                                                                                         |
| --------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `docs/ecommerce-handoff-agente-sito.md` | Mandato principale, contratti effettivi, flussi, env, istruzioni operative e matrice di collaudo            |
| `packages/ecommerce-server`             | Pacchetto server da copiare nel repository del sito, completo di codice, tipi, template e `.env.example`    |
| `docs/ecommerce-*.md`                   | Guide Atlas di approfondimento; distinguere progetti iniziali e contratti attuali come spiegato nel mandato |
| `reference/atlas`                       | Sorgenti Atlas di sola consultazione, mantenuti nei rispettivi percorsi; non copiarli nel runtime del sito  |
| `snapshot.json`                         | Informazioni sulla consegna e sul perimetro ancora da implementare                                          |
| `manifest-sha256.json`                  | Inventario e hash dei file inclusi                                                                          |

Sono inclusi solo template `.env.example`, senza valori segreti reali. Non sono inclusi `.env`, dipendenze installate, dati Mongo, build, chiavi private o l’intero gestionale. Gli ambienti reali restano da configurare dall’utente.

## Messaggio da dare all’agente del sito

> Devi integrare l’ecommerce Atlas nel repository di questo sito. Leggi interamente `docs/ecommerce-handoff-agente-sito.md` come mandato operativo del punto 14, quindi ispeziona il sito e realizza progressivamente le parti indicate. Riusa `packages/ecommerce-server`; `reference/atlas` serve solo a verificare i contratti e non va importato nel sito. Conserva l’interfaccia esistente. Distingui i moduli già disponibili dal trasporto nominativo carrello/ordini/pagamenti ancora da scrivere. Non inventare API, prezzi o stati. Mantieni account negozio separati dallo staff Atlas. L’utente gestirà env, collegamenti e collaudo nei due nuovi progetti Vercel di prova. Documenta ciò che implementi e ciò che rimane da configurare senza chiedere segreti in chat, effettuare operazioni reali o dichiarare superati test non eseguiti.

La consegna dell’archivio completa il passaggio documentale richiesto in Atlas. L’integrazione effettiva nel sito e il collaudo del percorso completo restano attività da eseguire.
