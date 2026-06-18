# Rotte Chiedilo all'IA

## Rotte Canoniche

- `/chiedilo-all-ia`: landing evento.
- `/rimani-aggiornato` (path root): form pubblico MongoDB-backed per aggiornamenti, materiali, interesse e primo confronto gratuito. Pagina generica non legata a uno specifico evento. Design autonomo con palette verde soft.
- `/chiedilo-all-ia/registrazione/[registrationToken]`: registrazione privata protetta da `PRIVATE_EVENT_REGISTRATION_TOKEN`.
- `/chiedilo-all-ia/registrazione/thank-you`: conferma statica post registrazione.
- `/privacy`: informativa globale nel layout corporate.
- `/sicurezza`: pagina sicurezza globale nel layout corporate.
- `/cookie-policy`: cookie policy globale nel layout corporate.

## Rotte Rimosse

- `/chiedilo-all-ia/partecipa`
- `/consulenza`
- `/chiedilo-all-ia/thank-you`
- `/chiedilo-all-ia/privacy`
- `/chiedilo-all-ia/sicurezza`
- `/chiedilo-all-ia/cookie-policy`

Le rotte rimosse non hanno redirect applicativi. I link interni devono puntare solo alle rotte canoniche.
