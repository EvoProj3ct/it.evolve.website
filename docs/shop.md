# Shop Evolve: prodotti e sottositi

## Riferimenti studiati

- [Microduck](https://pollen-robotics.com/microduck/): navigazione globale per prodotto, menu locale, apertura visiva, film, simulatore, scelta del colore, galleria, risorse e invito finale. Il ritmo alterna presentazione, interazione e approfondimento, anziché iniziare da una griglia di articoli.
- [Reachy Mini](https://pollen-robotics.com/reachy-mini/): ogni oggetto ha un proprio ecosistema di primi passi, documentazione e app. La pagina racconta le funzioni attraverso dimostrazioni, montaggio, accessori e casi d’uso.

Lo shop riprende questi principi e l’energia dei colori anni Novanta. Testi, modelli e illustrazioni sono Evolve; non sono stati copiati media o marchi Pollen.

## Struttura

La route `/shop` apre `/shop/e-disk`. Il gruppo App Router `(shop)` è separato da `(site)`: ha navigazione, sottomenu e footer dedicati. Mantiene i font del sito e i componenti globali per le preferenze cookie.

| Percorso | Contenuto |
| --- | --- |
| `/shop/e-disk` | Presentazione e configuratore bicolore |
| `/shop/e-disk/documentazione` | App, collezione, NFC, collegamento e audio |
| `/shop/e-disk/app` | Stessa `EDiskExperience` già disponibile nel sito |
| `/shop/e-linker` | Presentazione, quattro forme, testo, logo e colori |
| `/shop/e-linker/documentazione` | Guida alla personalizzazione |

`/utils/e-disk` rimane disponibile. La nuova collocazione dell’app riusa il componente e la stessa memoria del browser. Cambiano soltanto il collegamento di ritorno e la spaziatura nella cornice shop; controller, comandi, UUID e conferme NFC non cambiano.

## Identità e palette

- Verde Evolve `#72C94F` → navigazione, richiami e sezione risorse.
- Nero vegetale del sito `#101914` → testo, bordi e pulsanti.
- Bianco del sito `#FCFDFB` → superfici e leggibilità.
- Verde scuro `#114928` e verde chiarissimo `#ECF3E9` → contrasto e configuratore.
- Viola Evolve `#8567C1`, lilla `#CABEE6`, corallo `#FF6666` → continuità con il sito.
- Estensione confinata allo shop: lime `#C1FF00`, viola elettrico `#8651FF`, rosa `#FF4FB7`, arancio `#FF7638` → energia pop, titoli, sticker e studi di colore.

I 30 colori del configuratore sono dimostrativi, non un inventario di filamenti disponibili.

## Configuratori

`products.ts` raccoglie prodotti, palette, forme, testi, FAQ e configurazione iniziale. Le due pagine riusano `ShopProductExperience`, mentre `ProductScene` carica Three.js soltanto sul client.

- **e-disk:** scocca e piano/dettagli indipendenti; 30 colori per ciascuno, mix, scambio, scelta casuale, rotazione del modello e pausa del disco. Il modello dimostrativo riprende le proporzioni del giradischi già presente nell’app.
- **e-linker:** rettangolo, quadrato, cerchio e triangolo; base estrusa con foro e anello; testo estruso fino a 18 caratteri, ridimensionato alla superficie disponibile; base e scritta/logo SVG con colori separati.
- **Loghi:** gli SVG con tracciati pieni vengono estrusi; PNG e JPG vengono applicati come immagini e conservano i propri colori. Non viene dichiarata una conversione automatica di immagini raster in rilievi stampabili. File elaborati nel browser; limite 2 MB e 4096 px per lato per le immagini.
- **Richiesta:** `Parliamone` apre una mail con il riepilogo. Il logo originale va allegato dall’utente. È disponibile anche il download JSON completo della configurazione, compreso il logo scelto.

Nessun prezzo, disponibilità o checkout è simulato. L’integrazione commerciale descritta nell’archivio di handoff ecommerce presente in `docs/` non fa parte di questa implementazione visiva.

## Media sostituibili

L’utente ha autorizzato placeholder creati per questa prima versione. La presentazione usa un modello 3D animato con pausa; la galleria usa illustrazioni di studi colore. Non sono filmati o fotografie del prodotto fisico.

Per inserire il film definitivo, impostare `video` sul prodotto in `products.ts` con il percorso di un file locale. Il componente contiene già il player HTML5 e il controllo pausa/ripresa. I modelli procedurali sono isolati in `productModels.ts`, per poterli sostituire con i render definitivi.

## Analisi del codice e limiti di verifica

- Layout con breakpoint per navigazione, sezioni, pannelli, palette e visualizzatore; scorrimento verticale del telefono preservato durante i gesti sul modello.
- Comandi da tastiera, etichette dei controlli, stato delle scelte, riepilogo annunciato, FAQ native e collegamento per saltare al contenuto.
- Animazioni ridotte secondo la preferenza del sistema; render sospeso fuori vista e con scheda nascosta; risorse WebGL smaltite all’uscita; illustrazione di riserva senza WebGL.
- Carattere 3D incluso localmente con licenza. Nessuna dipendenza npm aggiunta.
- Sono state lette le sorgenti e le API della versione Three.js installata. Test, build, typecheck, server e anteprime non sono stati eseguiti, secondo `AGENTS.md`.
- Aspetto effettivo su desktop/mobile, funzionamento in browser e prestazioni devono ancora essere collaudati dall’utente. Il modello non è un file esecutivo per la produzione.
