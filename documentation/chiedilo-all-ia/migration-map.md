# Chiedilo all'IA Migration Map

| Source | Target | Stato |
| --- | --- | --- |
| smart homepage | `/chiedilo-all-ia` | Migrata come landing evento standalone. |
| smart `/partecipa` | `/rimani-aggiornato` (path root) | Confluita nella pagina generica aggiornamenti/materiali/confronto. Non piu' specifica di Chiedilo all'IA. |
| target `/consulenza` errata | rimossa, confluita in `/rimani-aggiornato` | Nessun redirect creato. |
| smart `/registrazione/[token]` | `/chiedilo-all-ia/registrazione/[registrationToken]` | Mantenuta privata e protetta da token. |
| smart `/thank-you` | `/chiedilo-all-ia/registrazione/thank-you` | Spostata sotto registrazione. |
| smart privacy/sicurezza/cookie-policy | `/privacy`, `/sicurezza`, `/cookie-policy` | Globalizzate nel layout corporate. |
| `smart.chiedilo-ia-main` | rimossa dal target dopo verifica | Contenuti utili migrati o documentati. |

La migrazione non introduce redirect per le rotte rimosse e non integra strumenti analytics, marketing tracking o profilazione.
