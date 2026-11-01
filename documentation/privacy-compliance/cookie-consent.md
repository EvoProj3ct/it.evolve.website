# Cookie Consent

Il cookie consent e' globale e viene montato nel root layout `src/app/layout.tsx`.

## Interfaccia e prima visita

Il banner è un pannello inferiore flottante con logo Evolve a colori, fondo carta, bordo sottile e pulsanti arrotondati. La palette riprende il sito attuale: carta `#fcfdfb`, testo `#101914`, verde `#72c94f`, foresta `#2c7a62` e menta `#cde8d1`. Sostituisce fondo scuro, griglia e azioni in vetro della versione precedente. Anche la finestra dei dettagli usa la stessa veste chiara. Banner e finestra condividono `cookie-consent.module.css`, categorie e pulsanti.

Il banner contiene il solo collegamento alla Cookie Policy, senza il comando “Mostra dettagli”. Il pannello preferenze resta accessibile dalla policy e dal footer. La Cookie Policy riprende la stessa palette, con indice delle sezioni, scheda del cookie tecnico e stato delle categorie condiviso con il banner.

- Compare dopo l'inizializzazione client su qualunque pagina se manca un cookie valido. L'intro iniziale del sito rimane sopra il banner durante la propria animazione.
- Non viene riproposto a ogni navigazione o aggiornamento quando è già presente una scelta valida.
- Un cookie malformato, scaduto, privo di una data valida o con versione diversa viene ignorato.
- La sola modifica grafica non cambia la versione della policy e non annulla le scelte esistenti.
- Il collegamento «Preferenze cookie» nel footer riapre sempre il pannello. Per vedere il banner iniziale durante una verifica, usare una finestra privata o eliminare solo `evolve_cookie_consent` e ricaricare.
- Accettare, salvare i selezionati, rifiutare e chiudere il banner sono azioni esplicite. Scorrere o continuare a navigare non salva alcuna scelta.

## Cookie tecnico

- Nome: `evolve_cookie_consent`
- Versione: `2026-06-privacy-v1`
- Durata indicativa: circa 6 mesi
- Path: `/`
- SameSite: `Lax`
- Secure: presente su HTTPS, omesso su localhost HTTP.
- `choice`: `all`, `selected` o `rejected`, per distinguere il comando usato. I vecchi cookie validi senza questo campo sono letti come `selected`.
- `updatedAt`: data della scelta; usata anche per validare la scadenza.

Se il browser impedisce il salvataggio dei cookie, la scelta rimane nella memoria del provider durante la navigazione corrente. Al successivo caricamento completo il banner può ricomparire perché la scelta non è persistita.

## Categorie

- Tecnici: sempre attivi.
- Preferenze: predisposte, non utilizzate e disattivate.
- Analytics: predisposti, non utilizzati e disattivati.
- Marketing e profilazione: predisposti, non utilizzati e disattivati.

Non sono integrati Google Analytics, Google Tag Manager, Meta Pixel, LinkedIn Insight Tag, Hotjar, Microsoft Clarity, Vercel Analytics o strumenti equivalenti.

I quattro interruttori descrivono lo stato effettivo: necessari accesi e bloccati, altre categorie spente e non disponibili. Anche «Accetta tutti» mantiene `preferences`, `analytics` e `marketing` a `false`, perché nessuna di queste categorie è in uso. La finestra dei dettagli spiega questo comportamento.

L'introduzione futura di strumenti facoltativi richiede l'aggiornamento di policy, versione, modello dati, controlli e caricamento condizionato degli script prima di attivarli.

## Riapertura preferenze

Il pannello e' riapribile da `/cookie-policy` e dai footer tramite evento client `open-cookie-preferences`.

La finestra usa il dialog nativo del browser per gestione del focus, navigazione da tastiera ed Escape. Chiudere i dettagli senza confermare non modifica la scelta esistente; alla prima visita riporta al banner.

## Fonte normativa consultata

[FAQ Cookie del Garante](https://www.garanteprivacy.it/faq/Cookie), consultate il 22 ottobre 2026: con soli cookie tecnici il banner non è obbligatorio; l'informativa rimane necessaria. Questo sito mantiene volontariamente il banner alla prima visita. Le FAQ trattano anche durata della scelta, rifiuto e riapertura delle preferenze.

## Revisione grafica del 1 novembre 2026

Restyling del banner e del pannello preferenze in continuità con la nuova navigazione e la pagina Chi siamo. La gestione del consenso, le categorie e la versione della policy restano invariate. Layout predisposto per desktop, tablet e telefono. Nessuna build, test o anteprima eseguita, su richiesta dell'utente.
