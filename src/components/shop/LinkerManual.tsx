import Link from "next/link";
import styles from "./LinkerManual.module.css";

export const linkerManualSections = [
  { id: "inizia", title: "Prodotto e configurazione" },
  { id: "nfc", title: "Induzione e diagnostica NFC" },
  { id: "pla", title: "PLA, calore e manutenzione" },
  { id: "colori", title: "Colori e superfici" },
  { id: "sicurezza", title: "Sicurezza d’uso" },
];

function ExplodedView() {
  return (
    <figure className={styles.figure}>
      <svg
        className={styles.drawing}
        viewBox="0 0 600 444"
        role="img"
        aria-labelledby="linker-exploded-title linker-exploded-description"
      >
        <title id="linker-exploded-title">Esploso in sezione di un e-linker rettangolare</title>
        <desc id="linker-exploded-description">
          La parte superiore della scocca è rappresentata tagliata. Al centro si vede il tag NFC tondo
          con la bobina e il chip. Sotto si vede la sua sede nella scocca.
        </desc>
        <defs>
          <pattern id="linker-section-hatch" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <path d="M0 0v5" stroke="#71826c" strokeWidth="1.4" />
          </pattern>
        </defs>
        <g fill="none" stroke="#74856e" strokeWidth="1.05" strokeDasharray="4 6">
          <path d="M200 140v141M412 114v190M274 103v221" />
        </g>
        <g stroke="#304538" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round">
          <g transform="matrix(1 .24 -.63 .64 185 254)">
            <rect width="280" height="150" rx="18" fill="#d8e3d1" />
          </g>
          <g transform="matrix(1 .24 -.63 .64 185 242)">
            <rect width="280" height="150" rx="18" fill="#f7f9f2" />
            <circle cx="239" cy="25" r="9" fill="#bdcbb7" />
            <path d="M231 29a9 9 0 0 1 16 0" fill="none" strokeWidth="1" />
            <circle cx="138" cy="77" r="49" fill="#e4ebdd" />
            <path d="M92 92a49 49 0 0 1 92 0" fill="none" stroke="#75876e" strokeWidth="1.25" />
            <circle cx="138" cy="77" r="41" fill="none" stroke="#75876e" strokeWidth="1" strokeDasharray="4 4" />
            <path d="M126 77h24m-12-12v24" fill="none" stroke="#75876e" strokeWidth="1" />
          </g>
          <path d="M274 263v61" fill="none" stroke="#74856e" strokeWidth="1.05" strokeDasharray="4 6" />
          <g transform="matrix(1 .24 -.63 .64 185 161)">
            <circle cx="138" cy="77" r="43" fill="#c5d4bc" />
          </g>
          <g transform="matrix(1 .24 -.63 .64 185 156)">
            <circle cx="138" cy="77" r="43" fill="#eef2e5" />
            <g fill="none" stroke="#546c4d" strokeWidth="1.25">
              <circle cx="138" cy="77" r="35" />
              <circle cx="138" cy="77" r="30.5" />
              <circle cx="138" cy="77" r="26" />
              <path d="M110 56l18 15m0 12-15 12" />
            </g>
            <rect x="128" y="69" width="17" height="16" rx="2" fill="#304538" />
          </g>
          <g transform="matrix(1 .24 -.63 .64 185 39)">
            <path d="M280 62v17h-69l-38 52H18Q0 131 0 113V96l18 18h155l38-52Z" fill="#d8e3d1" />
            <path d="M280 62v17h-69l-38 52v-17l38-52Z" fill="url(#linker-section-hatch)" />
            <path d="M18 0h244q18 0 18 18v44h-69l-38 52H18q-18 0-18-18V18Q0 0 18 0Z" fill="#f7f9f2" />
            <circle cx="239" cy="25" r="9" fill="#e0e8d9" />
            <path d="M211 62h69v70q0 18-18 18H18q-18 0-18-18v-36m173 18-26 36" fill="none" stroke="#75876e" strokeWidth="1.15" strokeDasharray="4 5" />
            <text x="64" y="71" stroke="none" fill="#304538" fontSize="27" fontWeight="600" letterSpacing="-1.3">e-linker<tspan fill="#438438">.</tspan></text>
          </g>
        </g>
        <g fill="none" stroke="#536a4d" strokeWidth="1.3" strokeLinejoin="round">
          <path d="M389 100l49-35h71M317 242l53-10h139M308 330l56 29h145" />
        </g>
        <g fill="#536a4d">
          <circle cx="389" cy="100" r="2.6" />
          <circle cx="317" cy="242" r="2.6" />
          <circle cx="308" cy="330" r="2.6" />
        </g>
        <g fill="#f5f8ef" stroke="#536a4d" strokeWidth="1.5">
          <circle cx="524" cy="65" r="15" />
          <circle cx="524" cy="232" r="15" />
          <circle cx="524" cy="359" r="15" />
        </g>
        <g fill="#304538" fontSize="17" fontWeight="600" textAnchor="middle" dominantBaseline="central">
          <text x="524" y="65">1</text>
          <text x="524" y="232">2</text>
          <text x="524" y="359">3</text>
        </g>
      </svg>
      <figcaption className={styles.caption}>
        <span>Esploso in sezione · Schema fuori scala</span>
        <ol>
          <li>Scocca in PLA</li>
          <li>Tag NFC tondo con antenna e chip</li>
          <li>Sede del tag nella scocca</li>
        </ol>
      </figcaption>
    </figure>
  );
}

export function LinkerManual() {
  return (
    <div className={styles.manual}>
      <section id="inizia">
        <h2>Prodotto e configurazione</h2>
        <p>
          e-linker è un portachiavi con scocca in PLA stampata in 3D, anello metallico e tag NFC passivo
          integrato. Il tag è un dischetto che contiene un’antenna e un chip con memoria. Puoi salvare
          un indirizzo web in un record NFC standard (NDEF). Il chip conserva l’indirizzo anche
          quando allontani il telefono. Foto, video e altri contenuti restano nella pagina collegata.
        </p>
        <ExplodedView />
        <h3>Leggere il collegamento</h3>
        <p>
          Sblocca uno smartphone compatibile, attiva NFC se previsto dalle impostazioni e avvicina
          la parte piatta del portachiavi al retro del telefono. Tocca la notifica per aprire il link.
          Sui telefoni con lettura NFC in background in genere non serve installare un’app.
          Per visitare una pagina online serve una connessione a Internet.
          {" "}<a href="https://developer.android.com/develop/connectivity/nfc/nfc">NFC su Android</a>
          {" · "}<a href="https://developer.apple.com/documentation/CoreNFC/adding-support-for-background-tag-reading">NFC su iPhone</a>
        </p>
        <h3>Scrivere o cambiare il collegamento</h3>
        <ol>
          <li>Su Android, con NFC attivo, apri <Link href="/shop/e-linker/configura">Configura e-linker</Link> in Chrome.</li>
          <li>Incolla un indirizzo che inizi con <code>https://</code> o <code>http://</code>.</li>
          <li>
            Premi <strong>Scrivi su e-linker</strong>, autorizza l’accesso NFC se richiesto e tieni
            fermo il portachiavi vicino al telefono fino alla conferma.
          </li>
          <li>Allontana il portachiavi, poi avvicinalo di nuovo per verificare che apra il link appena scritto.</li>
        </ol>
        <p>
          Quando il browser non supporta la scrittura NFC, copia l’indirizzo in un’app per Android
          o iPhone che scriva record NDEF di tipo URL. Puoi sostituire il link ogni volta che il tag
          è scrivibile. Evita il comando <strong>Sola lettura</strong> delle app NFC se vuoi continuare a modificarlo,
          perché il blocco può essere permanente.
          {" "}<a href="https://developer.chrome.com/docs/capabilities/nfc">Compatibilità Web NFC</a>
        </p>
      </section>

      <section id="nfc">
        <h2>Induzione e diagnostica NFC</h2>
        <p>
          Il lettore del telefono genera un campo magnetico alternato a 13,56 MHz. A breve distanza,
          il campo induce una corrente nella bobina del tag. Il chip usa quell’energia per leggere o salvare
          i dati e comunica con il telefono modulando il campo. Il portachiavi funziona senza batteria
          e senza associazione Bluetooth.
          {" "}<a href="https://nfc-forum.org/learn/NFC-technology/">Specifiche di base NFC Forum</a>
        </p>
        <ul>
          <li>
            <strong>Il telefono non rileva il tag.</strong> Controlla che l’NFC sia attivo. Cerca il punto
            di lettura muovendo lentamente il portachiavi lungo il retro del telefono. Allontana chiavi,
            carte contactless e altre etichette NFC. Se necessario, rimuovi la custodia, soprattutto se
            contiene parti metalliche.
          </li>
          <li>
            <strong>La scrittura non riesce.</strong> Riprova con un solo tag vicino al lettore e tienilo
            fermo fino alla conferma. Se l’app segnala che il tag è in sola lettura, la sovrascrittura è bloccata.
          </li>
          <li>
            <strong>Il tag viene letto ma il link non si apre.</strong> Verifica l’indirizzo, la connessione
            e gli eventuali permessi di accesso della pagina. Se il link registrato è vecchio, riscrivilo.
          </li>
        </ul>
        <p>
          Urti forti, piegature, fori e infiltrazioni attraverso una scocca crepata possono danneggiare
          il chip o interrompere la bobina. Se la scocca è integra e il tag continua a non rispondere,
          prova con un secondo telefono NFC compatibile. Se vedi una crepa o parti esposte, sospendi l’uso.
        </p>
      </section>

      <section id="pla">
        <h2>PLA, calore e manutenzione</h2>
        <p>
          Il PLA (acido polilattico) è un poliestere. In una delle filiere più comuni, l’amido di mais
          viene trasformato in glucosio, poi fermentato per ottenere acido lattico, da cui si produce
          il polimero. Il filamento per la stampa può contenere anche pigmenti e additivi per la finitura opaca.
          {" "}<a href="https://www.energy.gov/cmei/fuels/articles/monomers-and-polymers">Come si ottiene il PLA</a>
        </p>
        <ul>
          <li>
            <strong>Calore.</strong> Per il portachiavi, evita per precauzione esposizioni a 50 °C o più.
            In alcuni gradi di PLA la transizione vetrosa si verifica intorno a 55–60 °C. In questa
            fascia il materiale perde rigidità e la scocca può deformarsi sotto carico. Tienila lontana
            da termosifoni, acqua calda e dal cruscotto di un’auto al sole.
            {" "}<a href="https://www.mdpi.com/2073-4360/17/7/836">Dati termici su un grado di PLA</a>
          </li>
          <li>
            <strong>Acqua e pulizia.</strong> Per togliere sporco e schizzi usa un panno morbido appena umido,
            poi asciuga il portachiavi. Evita immersioni, lavatrice, lavastoviglie, solventi e detergenti abrasivi.
          </li>
          <li>
            <strong>Sollecitazioni.</strong> Evita di piegarlo, torcere l’anello con forza o usarlo per sostenere
            pesi. Gli urti e la trazione possono crepare la scocca, specialmente vicino al foro dell’anello.
          </li>
        </ul>
      </section>

      <section id="colori">
        <h2>Colori e superfici</h2>
        <p>
          Nelle versioni in PLA opaco colorato in massa, il pigmento è distribuito nel filamento. Il colore
          rimane normalmente nella scocca durante l’uso. Lo sfregamento con le chiavi può comunque graffiare
          la superficie. Solventi ed esposizione prolungata al sole possono alterare aspetto e finitura.
          Se noti residui di colore o la superficie si sfalda, sospendi l’uso e contattaci.
        </p>
        <p className={styles.notice}>
          <strong>Contatto con bocca e alimenti.</strong> Tieni il portachiavi lontano da bocca, cibi
          e bevande. L’idoneità al contatto alimentare va valutata sul prodotto finito, compresi i
          pigmenti e la lavorazione.
          {" "}<a href="https://food.ec.europa.eu/food-safety/chemical-safety/food-contact-materials/legislation_en">Materiali a contatto con alimenti</a>
        </p>
      </section>

      <section id="sicurezza">
        <h2>Sicurezza d’uso</h2>
        <p className={styles.notice}>
          <strong>Portachiavi per adulti.</strong> Tienilo fuori dalla portata di bambini e animali domestici.
          L’anello, la catena e gli eventuali frammenti della scocca possono essere inghiottiti o causare soffocamento.
        </p>
        <ul>
          <li>Evita di aprire, forare o tagliare la scocca. Il tag è incorporato durante la stampa.</li>
          <li>
            Se la scocca si crepa, compaiono bordi taglienti o l’anello si allenta, smetti di usare
            il portachiavi e raccogli eventuali parti staccate.
          </li>
          <li>Evita di usarlo come gioco, oggetto da mordere o accessorio per il collare di un animale.</li>
        </ul>
      </section>
    </div>
  );
}
