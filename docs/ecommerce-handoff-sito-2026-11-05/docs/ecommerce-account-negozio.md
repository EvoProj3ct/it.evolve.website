# E-commerce — passo 6: identità esclusiva del sito

4 novembre 2026 · Codice predisposto; integrazione del repository sito, env e collaudo a carico dell’utente. Nessuna build, test applicativo, connessione Mongo, email o chiamata ai deployment reali eseguita dall’agente.

## Cosa comprende

`@evolve/ecommerce-server/auth` implementa registrazione, verifica email, login, sessioni opache, logout corrente/globale, recupero e cambio password, cambio email e profilo minimo. In Atlas `/ecommerce/account` permette ai ruoli Super/Amministrazione di consultare i profili verificati e sospendere/ripristinare l’accesso. Le azioni richiedono la password corrente dell’operatore Atlas, capability e controllo della revisione.

Il sito non è in questo workspace: i file di `packages/ecommerce-server/examples/next-auth/` sono **template da copiare nel sito togliendo `.example`**. Non sono route attive in Atlas. La vetrina resta un lavoro separato. Nessun account del negozio viene creato in `User`, aggiunto a NextAuth, approvato come personale o dotato di chiavi `UserResourceKey`. Lo stesso indirizzo può identificare due account indipendenti. Nessuna modifica al provider di autenticazione Atlas.

Il [passo 7](ecommerce-collegamento-clienti.md) predispone il consumo degli eventi `account_verified`/`email_changed` e rilegge il profilo verificato corrente per associare il Cliente. Le sole funzioni identità del passo 6 non creano Clienti, ordini o ricavi. Un cambio email richiede verifica dell’associazione prima del checkout; l’evento è un segnale, non un’autorizzazione a riutilizzare un vecchio collegamento.

## Dati e privilegi

Tutto nel database commerce separato: `commerce_accounts`, `commerce_sessions`, `commerce_auth_tokens`, `commerce_registration_profiles`, `commerce_account_profiles`, `commerce_account_access`, `commerce_auth_rate_limits`, `commerce_auth_deliveries`, `commerce_auth_audit`, `commerce_identity_events`. Schemi stretti, vincoli univoci e scritture transazionali. Nessun ruolo, permesso Atlas o ID di cliente commerciale nel payload di registrazione/profilo.

- Il backend sito legge/scrive le credenziali del solo negozio; inizializza `accountAccess`, ma non può modificarlo o eliminarlo. Audit/eventi sono inseribili e non riscrivibili; il profilo di registrazione è inseribile/leggibile, non modificabile.
- Il processore Atlas legge profili verificati, stato accesso e segnali di identità; può sospendere/ripristinare accessi e inserire audit. Non può leggere password del negozio, sessioni, token, profili non verificati, limiti pubblici o messaggi cifrati. I controlli di disponibilità accedono solo ai metadati di queste collezioni.
- La nuova verifica della password staff legge **solo l’operatore corrente**, tramite la connessione Atlas già esistente; nessun hash staff viene copiato nel database commerce o restituito al browser. Dieci tentativi per operatore/finestra di 15 minuti, conteggiati atomicamente nei contatori privati.

Applicare i documenti aggiornati di `scripts/ecommerce/mongo-privileges.mjs` alle credenziali distinte. Il codice genera documenti di privilegi; non li applica. Per queste collezioni il sito non necessita del privilegio `remove`; la pulizia TTL è svolta da Mongo. I contatori privati staff non hanno TTL e conservano solo ID operatore/finestra/numero, senza password. Le policy Mongo effettive vanno verificate nel proprio ambiente.

## Password e collegamenti email

Le nuove passphrase sono normalizzate NFC, da 15 a 128 caratteri Unicode e al massimo 512 byte UTF-8; nessun taglio silenzioso, trim o requisito arbitrario di simboli. Le email sono ASCII, normalizzate in minuscolo, senza eliminare punti o alias `+`; indirizzi internazionalizzati non supportati nella prima versione.

La proposta iniziale Argon2id è concretizzata con **scrypt di Node `crypto`, N=131072, r=8, p=1**, salt casuale 32 byte e derivazione 64 byte. È l’alternativa OWASP senza addon nativi; limite di due derivazioni concorrenti per processo e rate limit persistenti prima dell’hashing. La memoria massima autorizzata per derivazione è 256 MiB: dimensionare il runtime e collaudare tempi/concorrenza prima di esporre traffico. Non viene riutilizzato l’hash bcrypt degli utenti staff. Fonti: [OWASP Password Storage](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html), [Node crypto.scrypt](https://nodejs.org/docs/latest-v20.x/api/crypto.html#cryptoscryptpassword-salt-keylen-options-callback).

Registrazione/reset/cambio password controllano Pwned Passwords con il solo prefisso SHA-1 di cinque caratteri e risposta con padding. Password, hash completo ed email non vengono inviati a quel servizio. Controllo non disponibile → `503`, senza accettare la nuova password. Il sito deve mantenere l’attribuzione Have I Been Pwned presente nel template. [API ufficiale](https://haveibeenpwned.com/API/v3#SearchingPwnedPasswordsByRange).

La verifica email richiede **link monouso più password scelta alla registrazione**. Una registrazione duplicata non sostituisce la password esistente. Questo evita che un indirizzo preregistrato da un’altra persona venga attivato con la password di quest’ultima grazie a un click del proprietario dell’email. Il proprietario che non conosce quella password può usare il recupero: il token ricevuto permette di impostarne una nuova, verificare l’indirizzo e invalidare le credenziali precedenti. Il profilo di registrazione rimane una dichiarazione da controllare, non prova dei dati commerciali.

Verifica: 24 ore; reset e cambio email: 15 minuti. Si conservano solo hash SHA-256 separati per negozio/scopo. Nuova richiesta invalida i link precedenti dello stesso scopo; consumo atomico, controllo di scadenza, versione credenziali e versione accesso. Un GET non consuma mai il token. I link hanno origine server fissa e token nel frammento `#token=...`, letto in memoria e rimosso dalla cronologia prima del POST. Non mettere token in log, query, cookie, storage browser, analytics o redirect. Le pagine di conferma richiedono un’azione esplicita e devono essere escluse da script terzi/analytics/cache del sito.

Cambio email: sessione attiva e password corrente sia alla richiesta sia alla conferma, possesso della nuova casella, unicità dell’indirizzo; notifiche al vecchio e nuovo indirizzo. Cambio password, reset, conferma email e logout globale invalidano tutte le sessioni e i token precedenti; nessun login automatico. Il logout globale richiede password corrente. Per confermare un cambio email aprire il link con una sessione dello stesso account attiva.

## Sessioni e richieste

Cookie `__Host-storefront_session`: 32 byte casuali, `Secure; HttpOnly; Path=/; SameSite=Lax`, nessun `Domain`. Nel DB soltanto l’hash. Inattività 30 minuti, durata assoluta 12 ore, nessun “ricordami”. Ogni autenticazione rilegge sessione non scaduta/revocata, account attivo/verificato, profilo e versioni correnti. La lettura profilo e `authenticate()` aggiornano l’inattività; il cookie non prolunga la durata assoluta. TTL è solo pulizia.

`GET /api/ecommerce/v1/auth/csrf` emette un token HMAC legato a nonce cookie `__Host-storefront_csrf`, sessione corrente e origine fissa, valido 30 minuti. Il nonce cookie è HttpOnly/Secure/SameSite=Strict. Prima di ogni mutazione il sito ottiene questo token e lo invia nell’header `X-Storefront-CSRF`; login, logout, registrazione e reset sono inclusi. Origin deve coincidere esattamente con quella configurata; `Sec-Fetch-Site`, se presente, deve essere `same-origin`. Solo JSON e body massimo 16 KiB; campi non previsti rifiutati. Nessuna policy CORS permissiva. Errori/risposte personali sono `private, no-store`, senza stack o segreti.

I limiti Mongo sono condivisi tra istanze: email 200/ora globali, 20/rete, 5/indirizzo; login 1000/5 minuti globali, 60/rete/15 minuti, 10/indirizzo/15 minuti; altre azioni 2000/5 minuti globali, 30/rete/azione/15 minuti e 10/identità/azione/15 minuti. Lettura profilo: 10000/5 minuti globali, 600/rete, 120/sessione. Chiavi HMAC, nessun IP/email in chiaro nei bucket; IPv6 aggregato `/64`. Su Vercel è ammesso soltanto `x-vercel-forwarded-for` della piattaforma, non header liberamente inoltrati dal sito. Nessun indirizzo attendibile → `503`. Fuori Vercel è predisposto soltanto lo sviluppo locale, con bucket condiviso `127.0.0.1`; un diverso hosting richiede un adapter esplicito. [Header Vercel](https://vercel.com/docs/headers/request-headers).

Registrazione, reinvio e recupero restituiscono un risultato generico `202`; login usa lo stesso errore per credenziali errate/account non disponibile e svolge una derivazione anche per email assente. Non si promette indistinguibilità temporale assoluta. I limiti applicativi non sostituiscono protezioni di piattaforma contro volumi elevati; quelli globali possono bloccare temporaneamente anche richieste legittime. Il gateway deve preservare gli header della piattaforma e non mettere in cache API/pagine account.

Sospensione e ripristino incrementano `accessVersion`: le vecchie sessioni e i vecchi link restano inutilizzabili anche dopo il ripristino. Nessuna cancellazione di profilo, carrello, ordini o ricavi. Ogni nuova richiesta verifica lo stato; richieste già in corso possono terminare. I futuri comandi commerciali dovranno rivalidare l’accesso nella transazione del processore, come previsto dal passo 3. Per le future mutazioni sito chiamare **entrambi** `assertMutation(request)` e `authenticate(request)`, quindi passare il principal costruito dal server; non fidarsi di ID/header dal browser.

## Consegna delle email

Le route pubbliche inseriscono una consegna nella **stessa transazione** di account/token, senza inviare direttamente email. Il payload `{to, token}` è cifrato AES-256-GCM con nonce casuale, autenticazione di negozio/ID messaggio/ID chiave e key ring dedicato. Il token in chiaro non è memorizzato altrove. La chiave è una env del backend sito: identità e invio condividono questo confine server, non è una separazione KMS. Conservarla nel gestore segreti e non nei file versionati.

Il template privato `POST /api/internal/auth-mail` sul **sito** richiede `Authorization: Bearer <ECOMMERCE_AUTH_DELIVERY_SECRET>`, senza Origin browser. Processa al massimo cinque consegne, lease di 60 secondi, timeout provider 8 secondi, massimo cinque tentativi, backoff e termine di consegna 15 minuti. Chiamata Resend HTTPS fissa con Idempotency-Key per consegna; nessun provider selezionabile dal client. Dopo invio/scarto il payload cifrato viene rimosso; metadati scadono dopo sette giorni. La finestra di deduplicazione Resend è 24 ore, superiore al termine previsto dalla coda. [Idempotenza Resend](https://resend.com/docs/dashboard/emails/idempotency-keys).

**Occorre invocare questo worker dal proprio servizio privato con frequenza sufficiente**, per esempio ogni minuto, e monitorare gli esiti. Nessuna schedulazione è stata creata e nessuna email è stata inviata. Se non viene invocato, le email rimangono in attesa e poi scadono; il cliente può richiedere un nuovo link. Una consegna andata in errore dopo l’invio può essere ritentata con la stessa chiave idempotente. Non chiamare il worker dal frontend, dal submit pubblico o tramite proxy generici. Deployment Protection del sito richiede anche il bypass ufficiale configurato dal chiamante autorizzato.

## Configurazione e inizializzazione

1. Nel sito copiare il pacchetto, dichiarare dipendenza locale e Mongoose peer; copiare i template di `examples/next-auth/` nei percorsi indicati, togliendo `.example`. Personalizzare le pagine, inserire i link ai testi effettivi delle informative e preservare i controlli. Non montare queste API in Atlas.
2. Configurare esclusivamente nelle env server del sito le voci di `packages/ecommerce-server/.env.example`: URI Mongo ristretto, shop, origine HTTPS esatta, chiave HMAC, versioni testi, key ring email, credenziale/mittente Resend e segreto del worker. Chiavi indipendenti, mai `NEXT_PUBLIC_*`, mai `NEXTAUTH_SECRET`; nessun segreto richiesto in chat. Impostazioni del sito non vanno nella `.env` Atlas. Node 20 o superiore.
3. Applicare i ruoli Mongo limitati descritti in [modelli e inizializzazione](ecommerce-modelli-transazioni.md). Atlas prepara automaticamente collezioni e indici, senza script o migrazioni numerate. Aprire una pagina dati E-commerce in Atlas prima di usare le API identità del sito; il sito verifica gli indici e non ha permessi DDL.
4. Configurare l’invocazione privata delle email e i controlli di piattaforma. Il worker email è ospitato nello stesso progetto sito: restano **due deployment Vercel**, come richiesto.

Il [collegamento ai Clienti](ecommerce-collegamento-clienti.md) usa account separati e non assegna accessi Atlas. L’inizializzazione non revoca sessioni, consuma token o riscrive account esistenti.

Le retention implementate sono: sessioni/token alle loro scadenze, bucket dopo la finestra successiva, consegne sette giorni, audit autenticazione 90 giorni. Account non verificati, consensi iniziali ed eventi di identità non hanno cancellazione automatica: chiusura account e gestione dei dati richiedono il flusso dedicato prima dell’attivazione pubblica. Nessun TTL su documenti commerciali.

## API effettive predisposte

Base pubblica del **sito**: `/api/ecommerce/v1`. Tutti i POST/PATCH richiedono CSRF, Origin e JSON.

| Metodo / percorso                | Body / risultato                                                                                           |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| GET `/auth/csrf`                 | `{csrfToken}` e nonce cookie                                                                               |
| POST `/auth/register`            | `{email,password,name,kind,termsVersion,privacyVersion}`; kind `individual/company`, risposta generica 202 |
| POST `/auth/verify-email`        | `{token,password}`; nessuna sessione automatica                                                            |
| POST `/auth/resend-verification` | `{email}`; risposta generica 202                                                                           |
| POST `/auth/login`               | `{email,password}`; `{account,csrfToken}` e cookie; nessun token sessione nel JSON                         |
| POST `/auth/logout`              | `{}`; idempotente per sessione già assente; JSON 200                                                       |
| POST `/auth/logout-all`          | `{currentPassword}`; JSON 200, revoca globale                                                              |
| POST `/auth/forgot-password`     | `{email}`; risposta generica 202                                                                           |
| POST `/auth/reset-password`      | `{token,newPassword}`; nessun login automatico                                                             |
| POST `/auth/change-password`     | `{currentPassword,newPassword}`; richiede sessione, poi logout                                             |
| POST `/auth/change-email`        | `{email,currentPassword}`; richiede sessione; risposta generica 202                                        |
| POST `/auth/confirm-email`       | `{token,currentPassword}`; sessione dello stesso account, poi logout                                       |
| GET `/me`                        | `{account:{id,email,name,kind,phone?,emailVerified:true}}`; nessun ID Mongo o dato commerciale             |
| PATCH `/me`                      | `{name?,phone?}`; almeno una modifica, telefono vuoto lo rimuove; non modifica Clienti Atlas               |

In Atlas: `GET /api/ecommerce/staff/accounts?email=...&cursor=...` (email completa facoltativa, massimo 50 righe); `POST /api/ecommerce/staff/accounts/{profileId}/access` con `{status,expectedAccessVersion,reason,currentPassword}`. Staff obbligatorio Super/Amministrazione, cookie Atlas, Origin e `X-Atlas-Commerce: 1`. Il profileId è interno allo staff, mai un campo con cui scegliere l’identità del sito. Nessuna impersonificazione/reset staff della password cliente.

## Collaudo affidato all’utente

Verificare registrazione/verifica/login/reset con worker attivo e fermo; alias e duplicati concorrenti; preregistrazione da terzi; link scaduti/riutilizzati/consumati contemporaneamente; sconosciuto e sospeso con lo stesso errore pubblico; cambio email con casella già occupata e sessione errata; revoca su altre schede e dopo ripristino; scadenze anche prima del TTL; bypass CSRF/Origin e header IP contraffatti; richieste distribuite e provider HIBP/Resend irraggiungibili; retry invio/idempotenza/rotazione chiavi; rollback Mongo; tutte le negazioni dei privilegi e assenza di segreti in browser/log/cache. Provare anche le stesse email nei due archivi e il rifiuto delle credenziali del sito su login/API Atlas.

Verifiche dell’agente: formattazione/parser di codice e template, ESLint statico sui moduli JavaScript per riferimenti non definiti, codice irraggiungibile e ridefinizioni; controllo diff. Non equivalgono ai test applicativi o a una compilazione TypeScript. Passkey/MFA cliente e MFA staff non sono aggiunti in questo passo; la conferma staff è la password corrente, distinta dal requisito progettuale di MFA per le operazioni sensibili in produzione. Il collegamento commerciale del passo 7 è predisposto; prossimo sviluppo **passo 8, carrello e riepilogo**.
