# QA Checklist

- [ ] `/chiedilo-all-ia` mostra la landing e CTA verso `/rimani-aggiornato`.
- [ ] `/rimani-aggiornato` mostra copy aggiornamenti/materiali/primo confronto gratuito.
- [ ] Il form `/rimani-aggiornato` salva su MongoDB tramite `/api/consultation-requests`.
- [ ] `sourcePage` vale `rimani-aggiornato`.
- [ ] `sourceContext` vale `chiedilo-all-ia-rimani-aggiornato`.
- [ ] `contactReason` viene inviato e salvato.
- [ ] Consensi facoltativi non preselezionati.
- [ ] Link privacy e sicurezza puntano a `/privacy` e `/sicurezza`.
- [ ] Token non valido su registrazione privata restituisce not found.
- [ ] Token valido mostra form registrazione.
- [ ] Registrazione valida salva su `event_registrations`.
- [ ] Email Resend inviata o errore registrato come non bloccante.
- [ ] Redirect a `/chiedilo-all-ia/registrazione/thank-you`.
- [ ] Cookie banner appare al primo atterraggio da rotte site e standalone.
- [ ] Preferenze cookie riapribili da `/cookie-policy` e footer.
- [ ] Nessun analytics, marketing tracking o profilazione integrati.
- [ ] `npm run build` passa.
