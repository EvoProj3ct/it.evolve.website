# e-disk

Pagina: `/utils/e-disk`. Il laboratorio Q-learning resta nel progetto, ma non compare nel menu.

La nuova interfaccia conserva il protocollo del prototipo `index.html` fornito dall’utente. Non richiede modifiche al firmware.

## Collegamento BLE

Dispositivo selezionato dall’utente con filtro `namePrefix: EVOLVE`.

| Caratteristica | UUID |
| --- | --- |
| Servizio | `b9f00001-62f5-4e58-9777-71d66f8be001` |
| Notifiche ESP32 → browser | `b9f00002-62f5-4e58-9777-71d66f8be001` |
| Comandi browser → ESP32 | `b9f00003-62f5-4e58-9777-71d66f8be001` |

Payload testuali UTF-8, senza prefissi aggiunti, JSON o terminatori aggiunti. Scritture serializzate; supporto con risposta, senza risposta e `writeValue`, secondo le proprietà della caratteristica.

| Comando | Quando |
| --- | --- |
| `PING` | Dopo l’attivazione delle notifiche, prima di sincronizzare una riproduzione |
| `PLAY:<secondi>` | Solo dopo che YouTube conferma PLAYING e una durata finita e positiva |
| `TIME:<secondi>` | Durante la riproduzione, ogni 2500 ms |
| `STOP` | Pausa, stop, buffering, fine, errore, cambio brano, disconnessione o uscita dalla pagina |
| `WRITE:<codice>` | Scrittura NFC richiesta e confermata dall’utente |
| `CANCEL` | Annullamento scrittura NFC |

I secondi sono `max(1, ceil(durata - posizione))`. Le dirette YouTube non avviano il motore perché non hanno una durata finale affidabile. La chiusura improvvisa della scheda o del collegamento BLE può impedire la consegna di STOP: l’arresto su perdita di collegamento resta responsabilità del firmware.

Notifiche gestite senza cambiare sintassi: `TAG:<codice>`, `WRITE_WAIT`, `WRITE_OK:<codice>`, `WRITE_CANCEL`, `ERR:NO_CODE`, `ERR:WRITE`, `ERR:WRITE_TIMEOUT`, `ERR:BAD_CODE`, `ERR:BAD_DURATION`, `STATE:ACCEL`, `STATE:PLAY`, `STATE:MAX`, `STATE:DECEL`, `STATE:STOP`.

La voce Motore nel pannello del collegamento deriva dalle notifiche effettive. L’animazione del modello 3D rappresenta la riproduzione, non una misura dei giri del motore.

## Catalogo e ascolto

Stessa chiave localStorage del prototipo: `evolve-edisk-catalog-v1`. Stesso formato di importazione/esportazione, massimo 200 dischi:

```json
[{ "code": "1042", "title": "Il mio disco", "youtubeId": "abcdefghijk" }]
```

Codici di 4–8 cifre; ID YouTube di 11 caratteri. L’importazione richiede la conferma della sostituzione e non modifica i tag fisici.

YouTube viene caricato su selezione esplicita di un disco, con IFrame API ufficiale e player visibile di almeno 200 × 200 px, host `youtube-nocookie.com`. La riproduzione automatica può richiedere un ulteriore clic Play; il motore resta fermo finché il video non parte. Alcuni video non consentono l’incorporamento.

Test riproduce 32 secondi di audio originale sintetizzato con Web Audio, senza YouTube o giradischi e senza inviare PLAY/TIME al motore. La prova per codice nel pannello del collegamento simula invece la selezione di un disco della collezione, come nel prototipo.

Bluetooth richiede un browser compatibile con Web Bluetooth, un contesto HTTPS o localhost e il permesso esplicito del dispositivo. Nessuna connessione o riconnessione automatica.

Riferimenti: [Web Bluetooth](https://developer.chrome.com/docs/capabilities/bluetooth), [YouTube IFrame API](https://developers.google.com/youtube/iframe_api_reference), [requisiti del player](https://developers.google.com/youtube/terms/required-minimum-functionality).

## Feedback della pagina

- Il collegamento mostra selezione del dispositivo, connessione, attivazione dei servizi e delle notifiche, collegamento riuscito o errore.
- La lettura mostra il codice realmente ricevuto tramite TAG. Un codice non presente in collezione propone l'associazione con il campo codice già compilato.
- La scrittura mostra subito l'invio della richiesta; WRITE_WAIT avvia l'attesa del tag con conto alla rovescia di 30 secondi. Il pannello rimane aperto e il processo resta visibile sulla pagina anche se viene chiuso.
- Il messaggio di successo compare soltanto dopo WRITE_OK con lo stesso codice richiesto. Il firmware ha già verificato il tag tramite rilettura prima di emettere questo evento.
- CANCEL mostra l'annullamento in corso e attende WRITE_CANCEL. Timeout, mancata conferma, codice diverso e perdita della connessione hanno esiti distinti, senza dichiarare un successo.
- La scrittura mette in pausa il player e sospende PLAY/TIME finché l'operazione non è conclusa o annullata, perché il firmware accede al lettore solo a motore fermo.

## Formato del tag

La pagina non invia al tag titolo, URL, UID, JSON o prefissi EV:. Invia al firmware soltanto WRITE seguito da due punti e dal codice, come stringa di 4–8 cifre, preservando eventuali zeri iniziali. È il firmware fornito dall'utente a scrivere il solo codice come NDEF Text sui tag NTAG/Ultralight o come testo nel blocco 4 dei MIFARE Classic.

## Cassa Bluetooth e uscita audio

Il telefono/computer può mantenere il collegamento BLE al giradischi per NFC e comandi e usare contemporaneamente la propria uscita audio, anche una cassa Bluetooth associata al sistema. Il giradischi non trasmette audio: è il player del dispositivo a riprodurre la musica.

Il gruppo Collegamenti e Test è in alto a destra. Collegamenti apre un unico pannello con giradischi, cassa/cuffie, selezione delle uscite supportate e Test audio. I comandi separati sotto il player sono stati rimossi. Su Android la cassa si associa nelle impostazioni Bluetooth del telefono e si sceglie come uscita multimediale: Chrome Android non permette alla pagina di cercare, abbinare e selezionare una cassa audio. YouTube segue l'uscita di sistema: il player incorporato non espone una funzione di selezione dell'uscita tramite la IFrame API e non è possibile accedere al suo elemento audio/video da questo dominio.

Per la sola demo Test, dove il browser espone AudioContext.setSinkId, la pagina può usare un'uscita specifica già autorizzata. Se disponibile, il pulsante di scelta usa MediaDevices.selectAudioOutput direttamente dal clic dell'utente. Le uscite enumerate sono solo quelle già accessibili: non viene mai richiesto l'accesso al microfono per ottenere l'elenco completo. Il selettore è nascosto nei browser che non supportano queste funzioni; il Test continua a usare l'uscita di sistema.

Se un'uscita selezionata e prima disponibile scompare dall'elenco, la demo prova a tornare all'uscita di sistema e mostra un feedback. Le preferenze e gli identificativi delle uscite sono solo in memoria durante la sessione, senza invio a server o modifica dei cookie. La pagina non dichiara collegata una cassa di sistema di cui non può osservare lo stato.

Riferimenti: [AudioContext.setSinkId](https://developer.chrome.com/blog/audiocontext-setsinkid), [selectAudioOutput](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/selectAudioOutput), [audio Bluetooth Android](https://source.android.com/docs/core/connect/bluetooth/services).

Il collaudo è a cura dell'utente. Non avviare test, build, typecheck, server o anteprime: vedere AGENTS.md nella radice del progetto.
