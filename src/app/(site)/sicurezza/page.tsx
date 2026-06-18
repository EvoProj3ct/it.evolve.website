export const metadata = {
  title: "Sicurezza dei dati | Evolve",
  description: "Misure tecniche e organizzative adottate per la gestione dei dati nella webapp Evolve.",
};

export default function SicurezzaPage() {
  return (
    <main className="theme-light min-h-screen px-6 py-28 text-zinc-900">
      <article className="mx-auto max-w-4xl rounded-3xl bg-white p-8 shadow-xl ring-1 ring-zinc-200 sm:p-10">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-700">Misure tecniche e organizzative</p>
        <h1 className="mt-3 text-4xl font-bold">Sicurezza dei dati</h1>
        <p className="mt-6 text-zinc-700">Evolve adotta misure ragionevoli per proteggere i dati raccolti tramite la webapp. Nessun sistema può garantire sicurezza assoluta; le misure vanno verificate e aggiornate nel tempo.</p>

        <h2 className="mt-8 text-2xl font-semibold">Misure applicate</h2>
        <ul className="mt-2 list-disc space-y-1 pl-6 text-zinc-700">
          <li>Trasmissione tramite HTTPS nell'ambiente di produzione.</li>
          <li>Validazione server-side dei payload tramite schema.</li>
          <li>Honeypot anti-spam nei form pubblici e privati.</li>
          <li>Minimizzazione dei dati richiesti rispetto alla finalità dichiarata.</li>
          <li>Hash dell'indirizzo IP usato come metadato di sicurezza nelle collection MongoDB.</li>
          <li>Accesso ai dati limitato a soggetti autorizzati e fornitori tecnici necessari.</li>
        </ul>

        <h2 className="mt-8 text-2xl font-semibold">Fornitori tecnici</h2>
        <p className="mt-2 text-zinc-700">La webapp usa MongoDB per la persistenza delle richieste e Resend per le email transazionali di conferma registrazione. La configurazione effettiva e i relativi accordi devono essere mantenuti aggiornati dal titolare.</p>

        <h2 className="mt-8 text-2xl font-semibold">Responsabilità dell'utente</h2>
        <p className="mt-2 text-zinc-700">Invia solo dati necessari e non inserire informazioni sensibili non richieste nei campi liberi o nei contatti successivi.</p>

        <h2 className="mt-8 text-2xl font-semibold">Segnalazioni</h2>
        <p className="mt-2 text-zinc-700">Per segnalare problemi di sicurezza o richiedere chiarimenti scrivi a infoevolvecompany@gmail.com.</p>
      </article>
    </main>
  );
}
