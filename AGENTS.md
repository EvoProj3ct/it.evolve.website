# Preferenze di lavoro

- Il collaudo viene eseguito dall'utente. Non avviare test, build, typecheck, server di sviluppo o anteprime nel browser.
- Una richiesta generica di verificare il funzionamento autorizza l'analisi del codice e le relative correzioni, non l'esecuzione di controlli automatici o prove guidate da far svolgere all'utente.
- Eseguire un controllo soltanto se l'utente chiede esplicitamente di avviare quel controllo, revocando per tale operazione questa preferenza.
- Per e-disk, lavorare sul codice della pagina. Non usare Arduino IDE, Monitor Seriale o strumenti di accesso all'hardware.
- Mantenere il protocollo del giradischi: stessi UUID BLE e comandi. La scrittura NFC passa tramite WRITE:<codice numerico di 4-8 cifre>; il formato del tag è gestito dal firmware. Mostrare successo solo dopo WRITE_OK con lo stesso codice richiesto.
