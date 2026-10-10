# Transizione Evolve dopo l'hero

La seconda schermata della home è una finestra scura con il marchio Evolve. Entrando dalla prima schermata il riquadro arrotondato compie automaticamente quasi tutta l'apertura; uno scroll breve completa l'ultimo tratto fino a pieno schermo e muove leggermente il marchio e una luce tenue. Gli angoli si azzerano soltanto alla fine. Raggiunto il pieno schermo, la pagina passa automaticamente alla pagina bianca con la dichiarazione Evolve dopo una breve pausa. Se si torna alla schermata scura, il riquadro resta aperto e non ripete l'animazione.

## Palette

- Sfondo chiaro dell'hero `#FCFDFB` → sfondo della seconda schermata `#FCFDFB`.
- Testo e CTA scuri `#101914` → fondo della finestra `#0B120E`–`#16261B`.
- Verde del labirinto `#72C94F` → marchio e luce tenue dentro la finestra.

Con movimento ridotto la finestra è direttamente a pieno schermo, senza animazione legata allo scroll.

## Verifica visiva

- Desktop: entrando dall'hero il riquadro compie l'apertura automatica senza altro scroll; lo scroll successivo completa l'espansione a pieno schermo e, raggiunto il bordo, la pagina passa da sola alla dichiarazione Evolve. Tornando indietro e rientrando, il riquadro resta a pieno schermo.
- Mobile: apertura automatica visibile, completamento con lo swipe e passaggio autonomo alla dichiarazione Evolve; riquadro e marchio restano nella vista senza introdurre overflow orizzontale.
- Accessibilità di base: il marchio ha testo alternativo; con preferenza per movimento ridotto la finestra è statica.
- I controlli TypeScript e di build non sono stati eseguiti su richiesta dell'utente.
