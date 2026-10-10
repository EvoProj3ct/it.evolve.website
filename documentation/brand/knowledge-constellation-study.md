# Costellazione Evolve — studio homepage

La nuova sezione sostituisce nella home la precedente griglia Consulenza / Analisi / Sviluppo. Il componente precedente resta in `src/components/ServicesSection.tsx` per recuperare testi e idee durante il restyling.

## Comportamento

- La sezione occupa una schermata. Lo scroll in discesa la allinea interamente; la rete si compone una sola volta, dopo che lo scroll si ferma. Tornando nella sezione resta completa.
- Ogni nodo rivela il nome e accende i collegamenti vicini su hover o focus. Sul telefono il nome compare al tocco.
- Il clic apre una scheda sintetica e mostra sempre il percorso tratteggiato da Analisi al nodo scelto. La luce percorre rapidamente il tracciato dall'inizio alla fine. Il fantasmino parte la prima volta dall'ingresso; ai clic successivi ricalcola il tragitto dalla posizione esatta e può svoltare ai bivi intermedi senza tornare obbligatoriamente al nodo precedente. Ha dimensioni fisse sullo schermo.
- La scheda occupa lo spazio in alto a destra. Il percorso evidenziato parte sempre dall'ingresso e arriva al nodo in hover o selezionato; non accende i rami che proseguono oltre.
- I 15 nodi seguono un ordine concettuale: Analisi apre la rete, poi Informazione e Consulenza, quindi conoscenza e progetto, sviluppo e applicazioni. Formazione ed eventi, ATLAS e integrazioni elettroniche restano; RFID/NFC, e-commerce, E-Linker e chatbot sono stati tolti per alleggerire la schermata.
- La rete si disegna da sinistra a destra con segmenti ortogonali ispirati ai circuiti stampati e al labirinto della home. Una connessione secondaria continua unisce Stampa 3D e Integrazioni elettroniche: un prototipo stampato può includere sensori o altri componenti fisici. Solo il percorso selezionato è tratteggiato.
- I nodi quasi sulla stessa corsia vengono allineati e collegati con una linea orizzontale; i cambi di quota hanno spazio sufficiente e non formano piccoli scalini decorativi.
- Il gradiente delle linee usa coordinate SVG esplicite, così vengono rese anche le connessioni perfettamente orizzontali. I puntini decorativi sono stati eliminati per alleggerire la lettura.
- Movimento ridotto: rete già completa e fantasmino fermo sul nodo.

## Palette

- Fondo bianco della sezione precedente → nero verde `#080d0a` per l'alternanza con la dichiarazione bianca.
- Verde brillante del labirinto `#72c94f` → nodi attivi, traccia e fantasmino.
- Bianco dei testi → `#f6faf5`; testi secondari e rete usano toni verdi grigio a bassa intensità.

## Verifica visiva

- Desktop: rete e scheda viste nel browser a larghezza normale; selezione di “Analisi” e connessioni illuminate.
- Mobile: rete e scheda viste a 390 × 844; nessun overflow orizzontale (`scrollWidth` uguale a `clientWidth`).
- Accessibilità di base: nodi come pulsanti etichettati, focus visibile, scheda chiudibile con pulsante o Escape.
