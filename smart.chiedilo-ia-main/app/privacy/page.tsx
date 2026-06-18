export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-amber-50 px-6 py-16">
      <div className="mx-auto max-w-4xl rounded-3xl bg-white/90 p-8 shadow-xl backdrop-blur">
        <h1 className="text-4xl font-bold">Privacy Policy</h1>
        <p className="mt-6 text-zinc-700">
          Trattiamo i dati inseriti nei moduli della webapp esclusivamente per gestire richieste di aggiornamento, manifestazioni di interesse, iscrizioni agli eventi, comunicazioni organizzative e, se richiesto, invio di materiali pratici collegati agli incontri.
        </p>

        <h2 className="mt-8 text-2xl font-semibold">Dati raccolti</h2>
        <p className="mt-2 text-zinc-700">
          I dati raccolti possono includere nome, cognome, email, eventuale telefono, sede dell’evento selezionata, profilo professionale indicato, numero di eventuali accompagnatori, livello dichiarato di utilizzo dell’IA, preferenze informative e consensi forniti per privacy, sicurezza del dato, ricezione del kit post-evento, altri eventi formativi e futuri prodotti o servizi Evolve.
        </p>

        <h2 className="mt-8 text-2xl font-semibold">Finalità</h2>
        <ul className="mt-2 list-disc space-y-1 pl-6 text-zinc-700">
          <li>Gestione delle richieste di informazioni, aggiornamento o manifestazione di interesse.</li>
          <li>Gestione delle iscrizioni e delle comunicazioni organizzative relative agli eventi.</li>
          <li>Invio dello zip con il kit pratico post-evento, solo se richiesto.</li>
          <li>Eventuali comunicazioni su altri eventi formativi, prodotti o servizi Evolve solo se autorizzate.</li>
        </ul>

        <h2 className="mt-8 text-2xl font-semibold">Soggetti coinvolti</h2>
        <p className="mt-2 text-zinc-700">
          Gli eventi e le iniziative possono coinvolgere Evolve e soggetti partner indicati nelle singole pagine o comunicazioni organizzative. Eventuali ruoli privacy tra i soggetti coinvolti saranno definiti nelle informative ufficiali collegate all’iniziativa. I dati non saranno utilizzati per finalità diverse da quelle indicate senza consenso.
        </p>

        <h2 className="mt-8 text-2xl font-semibold">Diritti utente</h2>
        <p className="mt-2 text-zinc-700">
          Puoi richiedere accesso, rettifica, cancellazione e limitazione del trattamento scrivendo all’indirizzo indicato dal titolare del trattamento. Per richieste preliminari puoi scrivere a info@evolvecompany.tech.
        </p>
      </div>
    </main>
  );
}
