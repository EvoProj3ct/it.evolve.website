import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { ProductId } from "./products";
import styles from "./Shop.module.css";

const SECTIONS = {
  "e-disk": [
    { id: "inizia", title: "Il disco incontra il digitale" },
    { id: "dischi", title: "I dischi li stampiamo noi" },
    { id: "bundle", title: "Il bundle e la collezione" },
    { id: "collezione", title: "La tua collezione" },
    { id: "collegamento", title: "Collegare e-disk" },
    { id: "nfc", title: "Associare un disco NFC" },
    { id: "audio", title: "Dove ascolti la musica" },
  ],
  "e-linker": [
    { id: "inizia", title: "Un link sempre con te" },
    { id: "nfc", title: "Attività, prodotti e ricordi" },
    { id: "testo", title: "Una scritta in rilievo" },
    { id: "logo", title: "Prepara il tuo logo" },
    { id: "colori", title: "Due colori, il tuo stile" },
    { id: "richiesta", title: "Dall’idea all’oggetto" },
  ],
};

export function ProductDocumentation({ product }: { product: Exclude<ProductId, "e-led"> }) {
  const isDisk = product === "e-disk";
  return (
    <main id="shop-content" className={styles.docs}>
      <h1>Dentro {product}<span>.</span></h1>
      <p className={styles.docsLead}>{isDisk ? "L’oggetto, l’app e i tuoi dischi. Tutto quello che serve per capire come si incontrano." : "Il tuo brand, un prodotto, un ricordo: il portachiavi NFC che apre un collegamento con un gesto. Poi forme, logo e colori lo rendono tuo."}</p>
      <div className={styles.docsGrid}>
        <nav className={styles.docsIndex} aria-label={`Indice guida ${product}`}><span>In questa guida</span>{SECTIONS[product].map(section => <a key={section.id} href={`#${section.id}`}>{section.title}</a>)}<Link href={`/shop/${product}#configura`}>← Torna al configuratore</Link></nav>
        <div className={styles.docsBody}>
          {isDisk ? <>
            <section id="inizia"><h2>Il disco incontra il digitale.</h2><p>e-disk trasforma una canzone in un oggetto da scegliere, appoggiare e ascoltare. I dischi vengono stampati e personalizzati da Evolve: ognuno porta con sé un contenuto e una storia.</p><p>Il giradischi riconosce il disco tramite NFC e lo fa ruotare mentre il player sul telefono o sul computer riproduce il contenuto associato. L’audio segue il dispositivo che usa l’app.</p><Link className={styles.docsAction} href="/shop/e-disk/app">Apri l’app e-disk <ArrowUpRight size={17} /></Link></section>
            <section id="dischi"><h2>Tu scegli. Noi stampiamo.</h2><p>“Incidi i tuoi dischi” è il nome del percorso di personalizzazione. Scegli un titolo, una dedica e il carattere del disco; a stamparlo e personalizzarlo pensa Evolve. La musica rimane digitale e viene richiamata tramite l’app.</p><p>Il concept prevede una canzone su misura creata con il nostro tool IA oppure un brano esistente da YouTube o Spotify. Il tool IA è work in progress; YouTube è già supportato dall’app attuale, mentre il collegamento automatico a Spotify è in preparazione.</p><p>Nella pagina prodotto puoi modificare titolo, dedica e colore nell’anteprima. La demo dei tre dischi appesi usa brevi loop originali sintetizzati, senza collegamenti ai servizi musicali o al giradischi fisico.</p><Link className={styles.docsAction} href="/shop/e-disk#incidi">Incidi i tuoi dischi <ArrowUpRight size={17} /></Link></section>
            <section id="bundle"><h2>Un inizio, poi tutti i dischi che vuoi.</h2><p>Il bundle è composto da un e-disk nei colori scelti e tre dischi personalizzabili. Nel configuratore puoi scegliere tra il solo giradischi e questa combinazione iniziale.</p><p>Quando vuoi aggiungere una canzone, un regalo o un ricordo alla collezione, puoi acquistare altri dischi da Evolve senza ricomprare e-disk.</p><p>La pagina presenta il concept: opzioni e anteprime sono esplorabili, mentre carrello, prezzi e acquisto verranno collegati in seguito.</p></section>
            <section id="collezione"><h2>La tua collezione, un brano alla volta.</h2><p>Nell’app puoi aggiungere un disco indicando un titolo, un codice numerico di 4–8 cifre e il collegamento al brano su YouTube. Ogni codice identifica un disco della collezione; puoi conservarne anche gli zeri iniziali.</p><p>La collezione è salvata nel browser che stai usando. Le funzioni di esportazione e importazione permettono di conservarne una copia o trasferirla a un altro browser. Non viene sincronizzata automaticamente fra dispositivi.</p><p>I brani sono riprodotti tramite il player YouTube incorporato. Alcuni video non consentono la riproduzione incorporata; il browser può inoltre richiedere un tocco sul pulsante Play.</p></section>
            <section id="collegamento"><h2>Il collegamento al giradischi.</h2><p>Apri l’app da HTTPS o localhost in un browser che supporti Web Bluetooth. Dal pannello dei collegamenti scegli il giradischi e autorizza il collegamento al dispositivo Evolve. La pagina non si collega all’hardware senza una tua azione.</p><p>Supporto e disponibilità dipendono dal browser e dal sistema operativo. Se Web Bluetooth non è disponibile, la gestione della collezione rimane separata dal collegamento al dispositivo fisico.</p><p>Gli indicatori di connessione e motore riflettono i messaggi ricevuti dal dispositivo. La rotazione del modello 3D è una rappresentazione visiva, non una misura dei giri del motore.</p></section>
            <section id="nfc"><h2>Un codice per ogni disco NFC.</h2><p>Associa il brano al codice della collezione, poi usa la scrittura NFC nell’app per richiedere al giradischi di scrivere quel codice sul tag. Durante la scrittura, segui i messaggi nel pannello e presenta il tag al lettore quando richiesto.</p><p>La scrittura è conclusa soltanto quando il dispositivo conferma lo stesso codice richiesto. Attesa, errore, annullamento o perdita del collegamento non equivalgono a una scrittura completata.</p><p>Il formato del tag è gestito dal firmware del giradischi. L’app associa al tag un codice numerico; titolo e collegamento del brano rimangono nella collezione del browser.</p></section>
            <section id="audio"><h2>La musica segue il tuo dispositivo.</h2><p>Puoi ascoltare dal telefono o dal computer, oppure usare cuffie o una cassa collegata al sistema. Il collegamento BLE al giradischi serve per i tag e i comandi; l’audio passa dall’uscita multimediale del tuo dispositivo.</p><p>Per una cassa Bluetooth, abbinala dalle impostazioni del telefono o del computer e selezionala come uscita audio. Le possibilità di selezione direttamente nella pagina dipendono dal browser.</p><p className={styles.docsNote}>Il modello dello shop è un’anteprima dimostrativa del prodotto. Colori, finiture, dimensioni e disponibilità vengono confermati con Evolve.</p></section>
          </> : <>
            <section id="inizia"><h2>Un piccolo oggetto. Un accesso diretto.</h2><p>e-linker è un portachiavi stampato in 3D con un tag NFC al suo interno. Avvicinandolo a uno smartphone compatibile, il tag può aprire il collegamento scelto. Il tuo logo e i tuoi colori rendono riconoscibile l’oggetto; il link gli dà una destinazione.</p><p>Rettangolo, quadrato, cerchio o triangolo: scegli la base dal configuratore. Trascina il modello per osservarlo in 3D; le quattro frecce, Q/E e Home permettono di ruotarlo e ripristinare la vista da tastiera.</p></section>
            <section id="nfc"><h2>Che cosa vuoi far scoprire?</h2><p>Per la tua attività puoi scegliere sito, social, menu, catalogo o una pagina di contatto. Per un prodotto, una scheda o un video di presentazione. Per un amico, un album di foto, una dedica o un ricordo online.</p><p>Il tag apre un link: immagini, musica e video rimangono nel servizio che li ospita. Per un ricordo personale, imposta nella pagina di destinazione chi può accedere al contenuto.</p><p>Indica il collegamento desiderato nella richiesta a Evolve: definiamo la destinazione e la predisposizione NFC insieme alla personalizzazione del portachiavi.</p></section>
            <section id="testo"><h2>Lascia un segno, in rilievo.</h2><p>Inserisci una scritta fino a 18 caratteri: il modello ne mostra una prima estrusione sulla base. Il testo si adatta allo spazio disponibile nella forma scelta.</p><p>Nomi brevi e lettere ben distinte sono più leggibili su un piccolo oggetto. Puoi lasciare il campo vuoto per usare soltanto il logo, oppure combinare entrambi.</p><p>La dimensione minima delle lettere e gli spessori effettivamente stampabili vengono verificati prima della produzione.</p></section>
            <section id="logo"><h2>Il tuo logo, preparato bene.</h2><ul><li><strong>SVG:</strong> usa tracciati pieni e converti eventuali testi in tracciati. Il configuratore mostra le forme vettoriali in rilievo, nel colore scelto per la scritta.</li><li><strong>PNG:</strong> un’immagine con sfondo trasparente è adatta a vedere come si dispone il logo sulla base.</li><li><strong>JPG:</strong> viene mostrato con il proprio sfondo. Scegli un’immagine con un taglio vicino al logo.</li></ul><p>I file devono essere al massimo di 2 MB; per le immagini, fino a 4096 × 4096 pixel. Se un SVG contiene molti dettagli o risorse esterne, esportane una versione semplificata e autonoma.</p><p>PNG e JPG vengono mostrati sulla superficie: non sono trasformati automaticamente in rilievi stampabili. Il logo viene letto nel browser e non caricato su un server da questo configuratore.</p></section>
            <section id="colori"><h2>Base e dettagli, separatamente.</h2><p>Apri la palette dalla riga “Base” oppure “Rilievo”, poi scegli una delle 16 tonalità dimostrative. I due comandi sotto le righe permettono di scambiare i colori o scegliere un abbinamento casuale; puoi anche partire da uno dei mix suggeriti.</p><p>Le immagini PNG e JPG conservano i propri colori. Il colore del rilievo si applica al testo e ai tracciati dei loghi SVG.</p><p>I colori sullo schermo sono indicativi: resa del materiale, finitura e filamenti disponibili vengono concordati con Evolve.</p></section>
            <section id="richiesta"><h2>Dall’idea all’oggetto.</h2><p>“Salva la tua configurazione” scarica un riepilogo delle scelte. “Parliamone” apre una mail con forma, scritta e colori: se hai usato un logo, allega anche il file originale alla mail.</p><p>L’anteprima non è un file di produzione. Prima di stampare definiamo dimensioni, spessori, leggibilità, quantità, prezzo e disponibilità.</p><Link className={styles.docsAction} href="/shop/e-linker#configura">Crea il tuo e-linker <ArrowUpRight size={17} /></Link></section>
          </>}
        </div>
      </div>
    </main>
  );
}
