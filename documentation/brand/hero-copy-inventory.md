# Hero homepage: inventario della prova

Il componente precedente resta in `src/components/HeroSlider.tsx`. La homepage usa ora `src/components/GhostMazeHero.tsx`. Questo inventario conserva i testi e i collegamenti delle tre slide per le revisioni successive.

| Slide | Etichetta | Titolo | Descrizione | CTA | Destinazione | Immagine |
|---|---|---|---|---|---|---|
| 1 | Consulenza | Software su misura | Trasformiamo processi complessi in strumenti digitali chiari, scalabili e integrati con il lavoro reale dell'azienda. | Scopri come | `/about` | `/hero/slide1.png` |
| 2 | Analisi | Analisi prima del codice | Partiamo dall'analisi operativa per definire priorità, perimetro e investimento corretto prima di scrivere codice. | Il nostro metodo | `/about` | `/hero/slide2.png` |
| 3 | Sviluppo | Sistemi che scalano | Costruiamo ecosistemi modulari per dati, processi e operatività: meno strumenti dispersi, più controllo. | Scopri Atlas | `/portfolio` | `/hero/slide3.png` |

## Prova attiva

- Titolo provvisorio: `Consulenza, software e stampa 3D`.
- Descrizione provvisoria: `Progettiamo soluzioni software e hardware per migliorare il lavoro della tua azienda.`
- CTA principale: `Scopri come` verso `/about`, come nella slide 1.
- CTA secondaria aggiunta: `Parliamo del tuo progetto` verso `/contact`.
- Etichetta: `Evolve`, senza pallino decorativo.
- La composizione usa tre fantasmini pixel, più piccoli, e i muri di un labirinto visibili solo nell'area illuminata dal puntatore. Il cursore resta la freccia standard. Le immagini delle slide non sono utilizzate nella prova.
- Nella sola homepage la barra di navigazione passa a un bianco translucido con controlli più discreti; sulle altre pagine resta la versione precedente.
- La fascia con l'invito a muovere il cursore è stata rimossa. In sviluppo è nascosto anche l'indicatore Next.js.
- Il labirinto usa il verde Evolve `#72C94F`. La griglia logica è di 48 px: i contorni dei corridoi sono costruiti su mezze celle da 24 px, senza segmenti terminali o tratteggi.
- Al contatto con la freccia in movimento resta la coppia di occhi: torna attraverso i corridoi al recinto in alto a destra, attende un secondo, il fantasmino lampeggia bianco/nero senza bordo e poi riprende l'inseguimento.
- Il recinto occupa tre celle della griglia e comunica con il labirinto tramite un ingresso centrale aperto. È ricavato dagli stessi contorni dei corridoi e, come il resto del labirinto, compare soltanto nell'area illuminata.
- I fantasmini hanno una silhouette pixel simmetrica a tre punte, occhi più piccoli e pupille che seguono la direzione di marcia. Le CTA usano un tasto scuro con angoli appena smussati e un link testuale: all'hover compaiono la stessa linea verde di 64 × 1 px e un lieve movimento delle frecce.
- Su touch la luce resta fissata all'ultimo punto toccato, fino al tocco successivo.
- Alla prima rotazione della rotella verso il basso sulla hero, lo scroll raggiunge direttamente la sezione dei servizi. Anche uno swipe verso l'alto sulla hero porta alla sezione successiva; le preferenze di movimento ridotto restano rispettate.
- La cornice rettangolare esterna del labirinto è rimossa; rimangono solo i contorni dei corridoi, aperti ai margini.

La prima iterazione della prova usava titolo e descrizione della slide 1, un labirinto disegnato come rete di linee, fantasmini arrotondati e un piccolo Pac-Man al posto del cursore. I testi originali restano nella tabella sopra e in `HeroSlider.tsx`.

## Palette della prova

| Ruolo | Prima | Prova |
|---|---|---|
| Verde principale | `#72C94F` | `#72C94F`, primo fantasmino |
| Accenti delle illustrazioni | Colori variabili nelle tre immagini | `#8567C1` e `#FF6666`, secondo e terzo fantasmino, dalla palette Evolve |
| Testo e CTA | Verde sfumato e bottone con bordo verde | Inchiostro scuro `#101914`, titolo Inter più leggero e CTA piena |
| Sfondo | Immagine bianca delle slide | Bianco caldo `#FCFDFB`, con luce verde molto tenue |
| Muri del labirinto | Verde scuro `#456B50` nella prima prova | Verde Evolve `#72C94F` |

## Verifica della revisione

| Controllo | Esito |
|---|---|
| Desktop | Hero, CTA e fantasmini controllati a 1265 px; il primo scroll arriva al bordo superiore dei servizi. |
| Mobile | Hero e CTA controllati a 390 px; nessuno scorrimento orizzontale della pagina. |
| Accessibilità base | I due CTA restano link semantici con focus visibile; lo scroll rispetta la preferenza di movimento ridotto. |
| Palette | Nessun nuovo colore: verde `#72C94F`, nero vegetale `#101914` e i tre colori dei fantasmini già documentati. |
