export default function SicurezzaPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-amber-50 px-6 py-16">
      <div className="mx-auto max-w-4xl rounded-3xl bg-white/90 p-8 shadow-xl backdrop-blur">
        <h1 className="text-4xl font-bold">Sicurezza dei dati</h1>
        <p className="mt-6 text-zinc-700">
          Applichiamo misure tecniche e organizzative per proteggere richieste di aggiornamento, manifestazioni di interesse e iscrizioni agli eventi da accessi non autorizzati, perdita o uso improprio.
        </p>
        <h2 className="mt-8 text-2xl font-semibold">Misure principali</h2>
        <ul className="mt-2 list-disc space-y-1 pl-6 text-zinc-700">
          <li>Connessioni cifrate HTTPS.</li>
          <li>Validazioni server-side e protezione anti-spam tramite honeypot.</li>
          <li>Accesso ai dati limitato al personale autorizzato.</li>
          <li>Audit trail su consensi e timestamp richieste.</li>
        </ul>
        <h2 className="mt-8 text-2xl font-semibold">Conservazione</h2>
        <p className="mt-2 text-zinc-700">I dati vengono conservati per finalità operative e legali, con revisioni periodiche e minimizzazione del dato.</p>
      </div>
    </main>
  );
}
