# Carattere per le estrusioni 3D

e-linker usa `helvetica-regular.typeface.json`, derivato da `public/fonts/Helvetica.ttf`, lo stesso carattere già incluso nel sito. Sono conservati nome e metadati del font originale. Il sottoinsieme contiene i glifi latini e la punteggiatura ammessi nel configuratore.

Per rigenerare l’asset: `node scripts/create-keyring-font.cjs`. Il convertitore usa fontkit già incluso in Next.js e scrive soltanto il JSON del carattere; non aggiunge dipendenze e non usa servizi remoti. La pagina carica direttamente il JSON locale, senza conversioni nel browser.

## Asset precedente

`helvetiker_bold.typeface.json` proviene dagli esempi ufficiali di Three.js:

- https://github.com/mrdoob/three.js/blob/dev/examples/fonts/helvetiker_bold.typeface.json
- https://github.com/mrdoob/three.js/blob/dev/examples/fonts/LICENSE

Scaricato il 5 novembre 2026. Licenza originale conservata nel file `LICENSE` accanto al carattere.
Rimane conservato con la sua licenza originale; non è più il carattere caricato da e-linker.
