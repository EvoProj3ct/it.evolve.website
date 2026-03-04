# Evolve Groq Chatboat Designer — Una Guida

Consulta la seguente guida per saperne di più su configurazione e modi di utilizzo di questo chatbot wizard serverless.

# 1. Che cos'è realmente questo applicativo?

Questo progetto è un **laboratorio di progettazione per agent conversazionali**.

Non è una chat generica.
Non è un prodotto finale.
È uno strumento di controllo e analisi.

Quando si sviluppano agent con modelli LLM (Large Language Models), emergono sempre tre problemi strutturali:

1. Il contesto cresce rapidamente e diventa costoso.
2. Il comportamento del modello diventa imprevedibile.
3. Non si ha visibilità su cosa sta succedendo internamente.

Questo playground serve a rendere visibile e controllabile tutto questo.

È una lente di ingrandimento sopra il modello.

---

# 2. Perché non basta una semplice chat?

Una chat tradizionale fa solo questo:

Utente → Modello → Risposta

Ma in produzione questo non basta.

Un agente reale deve:

* Verificare che l'input sia coerente
* Gestire memoria a lungo termine
* Ottimizzare costi
* Prevenire comportamenti fuori contesto
* Essere auditabile

Questa applicazione introduce questi livelli di controllo in modo esplicito.

---

# 3. Avvio del progetto (e perché serve un server locale)

L'app è completamente frontend.
Non esiste backend.

Per avviarla:

```bash
npx serve . -p 5173
```

Perché non basta aprire il file HTML?

Perché i browser moderni bloccano alcune operazioni `fetch` quando i file sono aperti direttamente dal filesystem.

Usare un server locale evita problemi CORS e rende l'ambiente coerente con produzione.

---

# 4. Cos'è una Groq API Key e perché è fondamentale

La API Key è la tua identità verso l'infrastruttura Groq.

Ogni chiamata che fai:

* Viene autenticata tramite la key
* Consuma risorse associate alla key
* È soggetta a limiti legati alla key

Per un team è fondamentale:

* Non condividere la stessa key tra sviluppatori
* Non committare mai la key su repository
* Ruotare periodicamente le chiavi

La key viene salvata in `localStorage`, quindi rimane locale al tuo browser.

---

# 5. Perché esiste il Debug?

Il Debug non è un optional.
È uno strumento di ottimizzazione.

Senza debug, stai guidando al buio.

Con debug attivo puoi vedere:

* Quando interviene il checkpointer
* Quando viene aggiornato OLD_CONTEXT
* Quanti token stai consumando
* Se stai avvicinandoti ai limiti

Perché è importante?

Perché l'ottimizzazione dei prompt è strettamente legata ai token.

Esempio pratico:

Se vedi che una risposta usa 900 token ma poteva usarne 300,
puoi:

* Rendere il system prompt più conciso
* Ridurre historyTurns
* Attivare Long Memory

Il debug è quindi uno strumento di controllo economico.

---

# 6. Comprendere i limiti (Rate Limits)

Quando usi un modello LLM non hai risorse infinite.

Esistono limiti come:

* Requests Per Day (RPD)
* Tokens Per Minute (TPM)

Superare questi limiti comporta errori 429.

L'app legge automaticamente gli header di risposta e li mostra nel Debug.

Questo permette al team di:

* Pianificare carichi
* Capire quando un test sta diventando costoso
* Evitare blocchi improvvisi

---

# 7. La Pipeline Agent: cosa succede davvero quando premi "Invia"

Non stai facendo una singola chiamata.

Stai attivando una pipeline strutturata:

1. Checkpointer
2. Long Memory
3. Main Model

Questa architettura separa responsabilità.

---

# 8. Il Checkpointer — perché è strategico

Il checkpointer è un classificatore logico.

Non genera contenuto.
Decide se generarlo.

Serve a:

* Impedire che l'agente venga portato fuori contesto
* Ridurre consumo inutile di token
* Evitare prompt injection

Restituisce tre stati:

* GREEN: procedi
* ORANGE: avviso
* RED: blocca

Questo è fondamentale in ambienti aziendali dove il controllo del contesto è critico.

---

# 9. La Long Memory — che cos'è davvero?

Un modello ha una finestra di contesto limitata.

Se invii troppi messaggi:

* Aumenti token
* Aumenti costi
* Rischi di superare il limite massimo

La Long Memory è una strategia di compressione.

Prende messaggi vecchi e li sintetizza in un riassunto strutturato chiamato:

OLD_CONTEXT

Questo permette di:

* Mantenere informazioni importanti
* Eliminare ridondanza
* Ridurre token inviati al main model

È una forma di memoria semantica persistente.

---

# 10. Il Main Model

È il generatore finale.

Riceve:

* System Prompt
* OLD_CONTEXT
* Pre-assistant
* Ultimi N turni

E produce la risposta.

Tutte le altre componenti esistono per ottimizzare ciò che il Main Model riceve.

---

# 11. Impostazioni — spiegazione approfondita

Ogni parametro modifica comportamento, costo o stabilità.

---

## UI / Debug

CRT, SFX, Boot

Sono puramente estetici.
Non influenzano il modello.

Debug Steps

Se attivo:

* Log completo
* Più visibilità

Se disattivo:

* Interfaccia più pulita
* Meno insight

---

## Groq Settings

Main Model

Determina capacità, velocità e costo.

Temperature

Controlla entropia.

Valori bassi:

* Risposte più stabili

Valori alti:

* Più creatività
* Più imprevedibilità

Top_p

Filtra lo spazio di campionamento.

Max_completion_tokens

Limita output massimo.
È un controllo diretto sui costi.

Seed

Serve per esperimenti riproducibili.

Stop

Permette di controllare dove termina la generazione.

History Turns

Controlla quanta conversazione recente inviare.

Più alto = più contesto = più costi.

---

## Long Memory Settings

Enable

Attiva compressione automatica.

Model

Meglio usare modello economico.

Decay Extra Turns

Determina quando avviare compressione.

LongMemory Prompt

Qui definisci come deve essere scritto OLD_CONTEXT.

Influenza direttamente qualità della memoria.

---

## Checkpointer Settings

Enable

Attiva filtro logico.

Use Model

Se disattivo → sempre GREEN.

Orange Limit

Determina tolleranza prima della chiusura.

Checkpointer Prompt

Definisce regole di classificazione.

Deve restituire JSON valido.

---

# 12. Perché esportare un Report?

L'export non è solo comodo.
È fondamentale per:

* Audit
* Documentazione tecnica
* Condivisione con stakeholder
* Analisi post-test

Un report contiene:

* Chat completa
* Debug log
* Configurazione
* Stato agent
* Ledger token

Questo rende il test riproducibile.

---

# 13. Come generare PDF

1. Clicca Export
2. Si apre nuova tab
3. Ctrl/Cmd + P
4. Salva come PDF

Consiglio:

Disattiva header/footer del browser per documento più pulito.

---

# 14. Reset completo ambiente

Se qualcosa non funziona:

```js
localStorage.clear();
location.reload();
```

Questo azzera tutto.



---

# 15) Reset e troubleshooting

## 15.1 Reset “soft”

* **Pulisci chat**: resetta solo `state.messages` runtime
* **Reset OLD_CONTEXT**: cancella longmem storage
* **Reset checkpoint**: riapre conversazione (se chiusa)

## 15.2 Reset totale

Apri DevTools Console e:

```js
localStorage.clear();
location.reload();
```

## 15.3 Errori comuni

* **HTTP 401/403**: API key errata o non autorizzata
* **HTTP 429**: rate limit (controlla `retry-after` e headers) ([console.groq.com](https://console.groq.com/docs/rate-limits?utm_source=chatgpt.com))
* **Modello non disponibile**: usa “Reload models” (GET `/models`)

---

# 16) Estensioni consigliate (workflow team)

1. **Naming standard report**

    * `YYYY-MM-DD__scenario__model__note.pdf`
2. **Checklist QA**

    * includere sempre: config + prompt + ledger
3. **Confronto modelli**

    * ripetere stessa sessione cambiando solo main model
4. **Regressioni prompt**

    * versionare preset in `prompts.js`

---

# Appendice A — Riferimenti rapidi (ufficiali)

* Groq Quickstart (API key + prima chiamata): ([console.groq.com](https://console.groq.com/docs/quickstart?source=post_page-----9e6cef31a20e--------------------------------&utm_source=chatgpt.com))
* Groq Rate Limits (header e retry-after): ([console.groq.com](https://console.groq.com/docs/rate-limits?utm_source=chatgpt.com))
* Groq API Reference: ([console.groq.com](https://console.groq.com/docs/api-reference?utm_source=chatgpt.com))

---

# Appendice B — Mini checklist (TEAM)

✅ Prima di testare

* [ ] API key inserita
* [ ] Main model selezionato
* [ ] historyTurns ok
* [ ] checkpointer/longmem configurati (se usati)

✅ Dopo il test

* [ ] Export report
* [ ] PDF salvato
* [ ] Verifica tokens/calls e rate limits


---

# Conclusione

Questo non è solo un playground grafico.
È un laboratorio di progettazione agents con scopo di chatbot.

Ti permette di:

* Capire come funzionano pipeline LLM
* Controllare costi
* Ottimizzare prompt
* Documentare comportamento
* Lavorare in team in modo strutturato

Se usato correttamente, riduce errori, costi e imprevedibilità.

Ed è questo il suo vero valore.