import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { ProductId } from "./products";
import styles from "./Shop.module.css";

const SECTIONS = {
  "e-disk": [
    { id: "inizia", title: "Il disco incontra il digitale" },
    { id: "collezione", title: "La tua collezione" },
    { id: "collegamento", title: "Collegare e-disk" },
    { id: "nfc", title: "Associare un disco NFC" },
    { id: "audio", title: "Dove ascolti la musica" },
  ],
  "e-linker": [
    { id: "inizia", title: "Parti da una forma" },
    { id: "testo", title: "Una scritta in rilievo" },
    { id: "logo", title: "Prepara il tuo logo" },
    { id: "colori", title: "Due colori, il tuo stile" },
    { id: "richiesta", title: "Dall’idea all’oggetto" },
  ],
};

export function ProductDocumentation({ product }: { product: ProductId }) {
  const isDisk = product === "e-disk";
  return (
    <main id="shop-content" className={styles.docs}>
      <h1>Dentro {product}<span>.</span></h1>
      <p className={styles.docsLead}>{isDisk ? "L’oggetto, l’app e i tuoi dischi. Tutto quello che serve per capire come si incontrano." : "Dalla prima forma al tuo logo. Qualche indicazione per dare carattere al tuo portachiavi."}</p>
      <div className={styles.docsGrid}>
        <nav className={styles.docsIndex} aria-label={`Indice guida ${product}`}><span>In questa guida</span>{SECTIONS[product].map(section => <a key={section.id} href={`#${section.id}`}>{section.title}</a>)}<Link href={`/shop/${product}#configura`}>← Torna al configuratore</Link></nav>
        <div className={styles.docsBody}>
          {isDisk ? <>
            <section id="inizia"><h2>Il disco incontra il digitale.</h2><p>e-disk è un giradischi interattivo per dischi NFC. Il tag identifica un brano della tua collezione; il giradischi fa ruotare il disco mentre il player sul telefono o sul computer riproduce la musica.</p><p>Non legge i solchi dei vinili e non trasmette l’audio a una cassa: movimento e riconoscimento del disco appartengono all’oggetto; catalogo e riproduzione appartengono all’app.</p><Link className={styles.docsAction} href="/shop/e-disk/app">Apri l’app e-disk <ArrowUpRight size={17} /></Link></section>
            <section id="collezione"><h2>La tua collezione, un brano alla volta.</h2><p>Nell’app puoi aggiungere un disco indicando un titolo, un codice numerico di 4–8 cifre e il collegamento al brano su YouTube. Ogni codice identifica un disco della collezione; puoi conservarne anche gli zeri iniziali.</p><p>La collezione è salvata nel browser che stai usando. Le funzioni di esportazione e importazione permettono di conservarne una copia o trasferirla a un altro browser. Non viene sincronizzata automaticamente fra dispositivi.</p><p>I brani sono riprodotti tramite il player YouTube incorporato. Alcuni video non consentono la riproduzione incorporata; il browser può inoltre richiedere un tocco sul pulsante Play.</p></section>
            <section id="collegamento"><h2>Il collegamento al giradischi.</h2><p>Apri l’app da HTTPS o localhost in un browser che supporti Web Bluetooth. Dal pannello dei collegamenti scegli il giradischi e autorizza il collegamento al dispositivo Evolve. La pagina non si collega all’hardware senza una tua azione.</p><p>Supporto e disponibilità dipendono dal browser e dal sistema operativo. Se Web Bluetooth non è disponibile, la gestione della collezione rimane separata dal collegamento al dispositivo fisico.</p><p>Gli indicatori di connessione e motore riflettono i messaggi ricevuti dal dispositivo. La rotazione del modello 3D è una rappresentazione visiva, non una misura dei giri del motore.</p></section>
            <section id="nfc"><h2>Un codice per ogni disco NFC.</h2><p>Associa il brano al codice della collezione, poi usa la scrittura NFC nell’app per richiedere al giradischi di scrivere quel codice sul tag. Durante la scrittura, segui i messaggi nel pannello e presenta il tag al lettore quando richiesto.</p><p>La scrittura è conclusa soltanto quando il dispositivo conferma lo stesso codice richiesto. Attesa, errore, annullamento o perdita del collegamento non equivalgono a una scrittura completata.</p><p>Il formato del tag è gestito dal firmware del giradischi. L’app associa al tag un codice numerico; titolo e collegamento del brano rimangono nella collezione del browser.</p></section>
            <section id="audio"><h2>La musica segue il tuo dispositivo.</h2><p>Puoi ascoltare dal telefono o dal computer, oppure usare cuffie o una cassa collegata al sistema. Il collegamento BLE al giradischi serve per i tag e i comandi; l’audio passa dall’uscita multimediale del tuo dispositivo.</p><p>Per una cassa Bluetooth, abbinala dalle impostazioni del telefono o del computer e selezionala come uscita audio. Le possibilità di selezione direttamente nella pagina dipendono dal browser.</p><p className={styles.docsNote}>Il modello dello shop è un’anteprima dimostrativa del prodotto. Colori, finiture, dimensioni e disponibilità vengono confermati con Evolve.</p></section>
          </> : <>
            <section id="inizia"><h2>Quattro forme. Un punto di partenza.</h2><p>Rettangolo, quadrato, cerchio o triangolo: scegli la forma della base in PLA dal configuratore. L’anteprima include un foro e un anello per aiutarti a immaginare il portachiavi completo.</p><p>Trascina il modello in qualsiasi direzione per osservarlo sopra, sotto e di lato. Da tastiera, le quattro frecce lo ruotano e Q ed E lo inclinano. Il tasto Home o il pulsante di ripristino riportano alla vista iniziale.</p></section>
            <section id="testo"><h2>Lascia un segno, in rilievo.</h2><p>Inserisci una scritta fino a 18 caratteri: il modello ne mostra una prima estrusione sulla base. Il testo si adatta allo spazio disponibile nella forma scelta.</p><p>Nomi brevi e lettere ben distinte sono più leggibili su un piccolo oggetto. Puoi lasciare il campo vuoto per usare soltanto il logo, oppure combinare entrambi.</p><p>La dimensione minima delle lettere e gli spessori effettivamente stampabili vengono verificati prima della produzione.</p></section>
            <section id="logo"><h2>Il tuo logo, preparato bene.</h2><ul><li><strong>SVG:</strong> usa tracciati pieni e converti eventuali testi in tracciati. Il configuratore mostra le forme vettoriali in rilievo, nel colore scelto per la scritta.</li><li><strong>PNG:</strong> un’immagine con sfondo trasparente è adatta a vedere come si dispone il logo sulla base.</li><li><strong>JPG:</strong> viene mostrato con il proprio sfondo. Scegli un’immagine con un taglio vicino al logo.</li></ul><p>I file devono essere al massimo di 2 MB; per le immagini, fino a 4096 × 4096 pixel. Se un SVG contiene molti dettagli o risorse esterne, esportane una versione semplificata e autonoma.</p><p>PNG e JPG vengono mostrati sulla superficie: non sono trasformati automaticamente in rilievi stampabili. Il logo viene letto nel browser e non caricato su un server da questo configuratore.</p></section>
            <section id="colori"><h2>Base e dettagli, separatamente.</h2><p>Apri la palette dalla riga “Base” oppure “Rilievo”, poi scegli una delle 30 tonalità dimostrative. I due comandi sotto le righe permettono di scambiare i colori o scegliere un abbinamento casuale; puoi anche partire da uno dei mix suggeriti.</p><p>Le immagini PNG e JPG conservano i propri colori. Il colore del rilievo si applica al testo e ai tracciati dei loghi SVG.</p><p>I colori sullo schermo sono indicativi: resa del materiale, finitura e filamenti disponibili vengono concordati con Evolve.</p></section>
            <section id="richiesta"><h2>Dall’idea all’oggetto.</h2><p>“Salva la tua configurazione” scarica un riepilogo delle scelte. “Parliamone” apre una mail con forma, scritta e colori: se hai usato un logo, allega anche il file originale alla mail.</p><p>L’anteprima non è un file di produzione. Prima di stampare definiamo dimensioni, spessori, leggibilità, quantità, prezzo e disponibilità.</p><Link className={styles.docsAction} href="/shop/e-linker#configura">Crea il tuo e-linker <ArrowUpRight size={17} /></Link></section>
          </>}
        </div>
      </div>
    </main>
  );
}
