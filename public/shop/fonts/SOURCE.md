# Carattere per le estrusioni 3D

Le anteprime di e-linker usano Helvetica, Helvetica Rounded, Helvetica Compressa, Inter e Geist Mono. L’altorilievo usa Helvetica Bold. I JSON sono derivati dai caratteri locali del sito e conservano il nome, la fonte e i metadati originali. Per Inter e Geist Mono la licenza SIL Open Font License si trova in `src/app/fonts/OFL.txt`.

Il comando `node scripts/create-keyring-font.cjs` rigenera i JSON dai caratteri sorgente usando fontkit, già incluso in Next.js. Il configuratore carica i JSON dei caratteri selezionati.

## Asset precedente

`helvetiker_bold.typeface.json` proviene dagli esempi ufficiali di Three.js:

- https://github.com/mrdoob/three.js/blob/dev/examples/fonts/helvetiker_bold.typeface.json
- https://github.com/mrdoob/three.js/blob/dev/examples/fonts/LICENSE

Scaricato il 5 novembre 2026. Licenza originale conservata nel file `LICENSE` accanto al carattere.
Rimane conservato con la sua licenza originale; non è più il carattere caricato da e-linker.
