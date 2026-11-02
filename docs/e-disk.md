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

Notifiche gestite senza cambiare sintassi: `TAG:<codice>`, `WRITE_WAIT`, `WRITE_OK:<codice>`, `ERR:NO_CODE`, `ERR:WRITE`, `ERR:WRITE_TIMEOUT`, `ERR:BAD_CODE`, `ERR:BAD_DURATION`, `STATE:ACCEL`, `STATE:PLAY`, `STATE:MAX`, `STATE:DECEL`, `STATE:STOP`.

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

Non sono stati eseguiti build, test, anteprime nel browser o prove hardware, come richiesto dall’utente.
