# Shop Evolve: prodotti e sottositi

## Riferimenti studiati

- [Microduck](https://pollen-robotics.com/microduck/): navigazione globale per prodotto, menu locale, apertura visiva, film, simulatore, scelta del colore, galleria, risorse e invito finale. Il ritmo alterna presentazione, interazione e approfondimento, anziché iniziare da una griglia di articoli.
- [Reachy Mini](https://pollen-robotics.com/reachy-mini/): ogni oggetto ha un proprio ecosistema di primi passi, documentazione e app. La pagina racconta le funzioni attraverso dimostrazioni, montaggio, accessori e casi d’uso.

Lo shop riprende questi principi e l’energia dei colori anni Novanta. Testi, modelli e illustrazioni sono Evolve; non sono stati copiati media o marchi Pollen.

## Struttura

La route `/shop` apre `/shop/e-disk`. Il gruppo App Router `(shop)` è separato da `(site)`: ha navigazione e sottomenu dedicati. Riusa lo stesso `SiteFooter` del sito principale, fuori dalla cornice CSS dello shop. Mantiene i font del sito e i componenti globali per le preferenze cookie.

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

Le palette sono dimostrative, non un inventario di filamenti disponibili: 30 colori per e-disk e 16 tonalità più sobrie per e-linker.

## Configuratori

`products.ts` raccoglie prodotti, palette, forme, testi, FAQ e configurazione iniziale. Le due pagine riusano `ShopProductExperience`, mentre `ProductScene` carica Three.js soltanto sul client.

- **e-disk:** scocca e piano indipendenti; 30 colori per ciascuno, mix, scambio, scelta casuale, rotazione del modello e pausa dell’anteprima. La copertina e la configurazione iniziale usano Sunset (arancio e rosa). Nel configuratore il giradischi ruota lentamente, si ferma durante il trascinamento e riprende dopo tre secondi; nella copertina ruota soltanto il disco. Braccio, testina, piatto e comandi hanno una finitura nera fissa. Il modello dimostrativo riprende le proporzioni del giradischi già presente nell’app.
- **e-linker:** rettangolo, quadrato, cerchio e triangolo; base estrusa con foro e anello; testo in Helvetica Regular fino a 18 caratteri, ridimensionato alla superficie disponibile, con rilievo basso e spaziatura controllata; base e scritta/logo SVG con colori separati. Il bordo è ardesia chiaro, come nel marchio illustrato. Il trascinamento usa una trackball tridimensionale, senza limiti di inclinazione. Le quattro frecce e Q/E ruotano il modello da tastiera, Home ripristina la vista. L’orientamento viene conservato cambiando forma, testo o logo.
- **Loghi:** gli SVG con tracciati pieni vengono estrusi; PNG e JPG vengono applicati come immagini e conservano i propri colori. Non viene dichiarata una conversione automatica di immagini raster in rilievi stampabili. File elaborati nel browser; limite 2 MB e 4096 px per lato per le immagini.
- **Scelta prodotto:** e-disk presenta `Aggiungi al carrello` come interfaccia di concept, con opzioni solo giradischi e bundle con tre dischi. L’utente ha chiesto espressamente di rimandare l’integrazione del carrello. Per e-linker rimane la richiesta via mail con `Parliamone`. Il download JSON salva configurazione e, per e-disk, opzione e numero di dischi inclusi.

Nessun prezzo, disponibilità o checkout è simulato. L’integrazione commerciale descritta nell’archivio di handoff ecommerce presente in `docs/` non fa parte di questa implementazione visiva.

## Media sostituibili

L’utente ha autorizzato placeholder creati per questa prima versione. La presentazione usa un modello 3D animato con pausa; la galleria usa illustrazioni di studi colore. Non sono filmati o fotografie del prodotto fisico.

Per inserire il film definitivo, impostare `video` sul prodotto in `products.ts` con il percorso di un file locale. Il componente contiene già il player HTML5 e il controllo pausa/ripresa. I modelli procedurali sono isolati in `productModels.ts`, per poterli sostituire con i render definitivi.

## Analisi del codice e limiti di verifica

- Layout con breakpoint per navigazione, sezioni, pannelli, palette e visualizzatore. e-disk conserva lo scorrimento verticale sulla scena; e-linker usa tutti i gesti nell’anteprima per la rotazione libera e mantiene lo scorrimento della pagina fuori dalla scena.
- Comandi da tastiera, etichette dei controlli, stato delle scelte, riepilogo annunciato, FAQ native e collegamento per saltare al contenuto.
- Animazioni ridotte secondo la preferenza del sistema; render sospeso fuori vista e con scheda nascosta; risorse WebGL smaltite all’uscita; illustrazione di riserva senza WebGL.
- Carattere 3D incluso localmente con licenza. Nessuna dipendenza npm aggiunta.
- Sono state lette le sorgenti e le API della versione Three.js installata. Test, build, typecheck, server e anteprime non sono stati eseguiti, secondo `AGENTS.md`.
- Aspetto effettivo su desktop/mobile, funzionamento in browser e prestazioni devono ancora essere collaudati dall’utente. Il modello non è un file esecutivo per la produzione.

## Rifinitura visiva del 5 novembre 2026

- Apertura e-disk e galleria verde/lilla/corallo conservate come richiesto; titolo “Meno scroll. Più rock’n’roll!”, introduzione “Il piacere di scegliere un disco, con tutta la libertà del digitale.” e sticker “La tua musica!”. Raccordo del banner inclinato con lo sfondo verde per eliminare la fascia bianca precedente.
- Nell’apertura e-disk il giradischi resta fermo: ruota soltanto il disco, con dieci note, piccoli fumetti e accenti cartoon sfalsati, più frequenti e variati, con salita lenta e dissolvenza. Pausa e animazioni ridotte fermano anche le note.
- e-linker ha una direzione autonoma: fondo bianco, Helvetica, orbite sottili, oggetto sospeso, finiture iniziali ghiaccio/ardesia e illustrazioni con profondità e ombre morbide. Base e scritta riprendono il marchio approvato: proporzioni più compatte, foro nell’angolo del rettangolo, firma “e-linker.” centrata e discreta, rilievo sottile, piccoli accenti verdi. La vista più frontale e l’ombra più leggera riducono l’effetto di lastra. Nessuna fascia rétro nella sua pagina.
- Menu senza icone generiche dei prodotti o fondi tondi: tre frammenti d’ombra condivisi, con tempi elastici differenti, si separano e si ricompongono nel passaggio tra le voci. La preferenza per le animazioni ridotte viene rispettata. Profilo e carrello rimangono predisposti e disabilitati; il link “Il mondo Evolve” è alla loro destra, con sottolineatura verde al passaggio e al focus.
- Nella barra del singolo prodotto, a sinistra del nome, compare un marchio SVG su fondo trasparente: il giradischi Sunset ripreso dalla galleria per e-disk e un portachiavi illustrato ghiaccio/ardesia con accenti verdi per e-linker. Gli asset riutilizzabili sono in `public/shop/brand/`; dimensioni ridotte su mobile e lieve movimento al passaggio/focus.
- Sovratitoli e numerazioni con slash eliminati dalle pagine prodotto e dalle guide. CTA aggiornate a “Personalizza” e “Scegli i tuoi colori”.
- Palette in un pannello flottante, aperto dalle due righe di colore: campioni a dimensione fissa, selezione senza spunta, gestione di tastiera, Escape, clic esterno e riposizionamento nel viewport. La griglia non occupa spazio nel pannello chiuso.
- Materiali fisici satinati, illuminazione neutra e transizione progressiva dei colori; incisioni del disco più sottili e prive di ombre proprie. Modello, illustrazioni e controlli rimangono dimostrativi.
- Footer condiviso ripristinato senza modificare i suoi file. Nessun test, build, typecheck o browser avviato.

## Dischi e bundle: estensione del concept

- Il secondo pulsante della copertina, viola con ombra blu, si trova a destra di `Scegli i tuoi colori` e punta a `#incidi`. La precedente riga NFC è stata rimossa. Il pulsante del sottomenu è `Crea la tua musica`; il sottomenu ha un fondo satinato traslucido sopra la pagina, con spaziatura compensata.
- I dischi sono stampati e personalizzati da Evolve. “Incidere” è il linguaggio del percorso creativo, non un’affermazione di incisione audio nei solchi. Testi, passaggi, FAQ, metadati e guida riflettono questo modello.
- Le tre card raccontano il disco come regalo: una dedica a chi ami, un ricordo tra amici e una canzone scritta con l’aiuto dell’IA. Nell’editor rimangono titolo/dedica/colore e una scelta compatta tra IA, YouTube e Spotify. Su indicazione dell’utente il tool IA rimanda a `/lavori-in-corso`. Spotify è dichiarato in preparazione; l’app esistente supporta YouTube e non è stata modificata.
- `EDiskRecordDemo` mostra tre dischi appesi selezionabili. Il disco scelto si posa sul modello, cambia colore ed etichetta e avvia un breve brano originale sintetizzato con Web Audio. Si possono sostituire i dischi e mettere in pausa/riprendere; uscendo dalla sezione l’audio viene fermato. Non avvia collegamenti BLE e non carica player esterni. La demo non simula brani Spotify o YouTube.
- `EDiskBundle` presenta e-disk + tre dischi; `Compra il bundle` seleziona l’opzione bundle e porta al selettore dell’offerta. Una sezione dedicata invita a continuare la collezione acquistando solo nuovi dischi. Nessun prezzo o acquisto viene inventato; i pulsanti di carrello rimangono predisposti e non operativi.
- Le note della copertina partono più in alto e hanno salita più lunga, senza taglio al bordo della scena. Al posto dell’asterisco, l’altoparlante avvia una demo rock’n’roll originale con un clic: dodici battute a 148 BPM, shuffle, chitarra pizzicata con overdrive, basso boogie e batteria. I tre loop dei dischi restano distinti. Un altro clic disattiva l’audio; la pausa della presentazione lo sospende. L’audio si ferma uscendo dalla copertina, nascondendo la scheda o cambiando pagina. Copertina e demo condividono l’esclusività della riproduzione, senza sovrapposizioni.
- Dopo la copertina e il banner, e-disk presenta subito le idee regalo, quindi la galleria colori e subito dopo l’editor “Dagli un nome”. Seguono la demo dei dischi, il bundle e infine il configuratore del giradischi. Risorse e FAQ chiudono il percorso. Le card regalo e l’editor sono sezioni distinte, con la sorgente musicale condivisa: scegliere una card prepara la relativa opzione nell’editor. La sezione duplicata con i tre passaggi è stata rimossa soltanto da e-disk.
- La galleria e-disk ha sei abbinamenti su due file da tre su desktop: Evolve, Pop, Sunset, Lagoon, Cherry e Afterhours. Ogni card è cliccabile per intero, applica la coppia di colori e porta al configuratore. Gli stessi sei abbinamenti sono disponibili nel pannello colori. e-linker ha una galleria autonoma prima del configuratore: Studio, Graphite, Forest, Slate, Blueprint e Sand, con fondi neutri, nomi delle finiture e piccoli campioni. Selettore e scelta casuale usano la palette dedicata di 16 colori.
- e-linker ha una base più sottile, angoli e triangolo raccordati, rilievi più bassi e finiture opache. Un raccordo ovale passa nel foro e scavalca il bordo; seguono sei maglie alternate di 90° e l’anello finale a due spire. Oggetto e catenella sono centrati insieme e la vista è più ampia per la rotazione libera. Anche l’illustrazione riflette le nuove proporzioni.
- Nuovi componenti e stili sono confinati allo shop. Home del sito, footer condiviso e protocollo dell’app e-disk restano invariati. Non sono stati avviati test, build, typecheck, server, anteprime o riproduzioni audio durante il lavoro.
