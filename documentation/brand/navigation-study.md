# Barra di navigazione: prova attiva

Il marchio grafico e tutte le categorie sono allineati al margine sinistro della finestra, anche sugli schermi larghi. Solo il pulsante Chiedilo a Leo è ancorato al margine destro. L'ordine è Home, Servizi, Eventi, Chi siamo, Utils, Contatti. Il pannello usa lo stesso margine sinistro: una frase e un link panoramico nella prima colonna, le voci nella seconda. Le voci entrano progressivamente con un movimento morbido; su mobile diventano sezioni espandibili con la stessa gerarchia. La barra è alta 60 px, senza linea inferiore a menu chiuso; la linea compare solo durante l'apertura del menu. Sulla home, a menu chiuso, un velo bianco semitrasparente (`rgba(252, 253, 251, 0.7)`) sbiadisce il labirinto nella barra, mentre il puntatore muove la stessa luce anche nel suo spazio. Quando il menu si apre, la barra torna opaca. La barra scompare scorrendo in basso e ricompare risalendo.

| Pannello | Frase | Link panoramico |
|---|---|---|
| Servizi | Rivolgiti a chi ha lavorato nel settore IA fin dalla sua nascita. | portfolio → `/portfolio` |
| Eventi | La tecnologia è un bene da condividere. | Rimani aggiornato → `/rimani-aggiornato` |
| Utils | Risorse da tenere a portata di mano. | Tutte le risorse → `/utils` |

## Destinazioni provvisorie

| Voce | Destinazione attuale |
|---|---|
| Software per il mondo finestra | `/portfolio` |
| Sviluppo sartoriale | `/portfolio` |
| Consulenza sartoriale | `/about` |
| Progettazione Agenti IA | `/portfolio` |
| Bandi | `/contact` |
| Seminari | `/rimani-aggiornato` |
| Chiedilo all'IA | `/chiedilo-all-ia` |
| Festival IA di Palestrina | `/rimani-aggiornato` |
| Brochure | `/utils#brochure` |
| Corsi | `/utils#corsi` |
| PDF utili | `/utils#pdf-utili` |

Le pagine dedicate alle voci dei Servizi e di alcuni Eventi non esistono ancora: i collegamenti generali sono temporanei. Utils ha una pagina dedicata con tre sezioni; brochure e corsi rimandano rispettivamente al contatto e agli aggiornamenti, mentre PDF utili contiene il programma già disponibile di Chiedilo all'IA.

## Palette e controlli

- Bianco caldo `#FCFDFB` per barra e pannello; inchiostro scuro `#101914` per il testo.
- Verde Evolve `#72C94F`, lo stesso del labirinto, per focus, link panoramico e chat; sfondo verde chiaro senza bordi per la voce attiva e rettangolare per le sottovoci al passaggio del puntatore. I testi restano scuri o in un verde più leggibile.
- La griglia resta composta da celle quadrate di 48 px e supera i bordi laterali del viewport; l'eventuale scomparsa delle linee ai lati dipende dalla sfumatura circolare della luce. I corridoi interni visibili sono collegati nella griglia prima di disegnare i muri. I fantasmini usano solo questi corridoi: restano interamente inquadrati senza scavalcare le linee.
- Desktop: verificati allineamento, apertura e passaggio tra i pannelli, link verso Chiedilo all'IA.
- Mobile a 390 px: verificati apertura, accordion e contenimento del menu nella viewport.
- Accessibilità base: pulsanti con `aria-expanded`, link semantici, focus visibile, Escape e freccia giù sul pannello desktop, movimento ridotto.

