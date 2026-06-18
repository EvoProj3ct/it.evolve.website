export const metadata = {
  title: "Privacy Policy | Evolve",
  description: "Informativa generale sul trattamento dei dati personali nella webapp Evolve.",
};

export default function PrivacyPage() {
  return (
    <main className="theme-light min-h-screen px-6 py-28 text-zinc-900">
      <article className="mx-auto max-w-4xl rounded-3xl bg-white p-8 shadow-xl ring-1 ring-zinc-200 sm:p-10">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-700">Informativa generale</p>
        <h1 className="mt-3 text-4xl font-bold">Privacy Policy</h1>
        <p className="mt-6 text-zinc-700">Ultimo aggiornamento: 18 giugno 2026. Questa informativa descrive in modo generale come la webapp Evolve tratta i dati raccolti tramite navigazione e form.</p>

        <h2 className="mt-8 text-2xl font-semibold">Titolare del trattamento</h2>
        <p className="mt-2 text-zinc-700">Evolve Srls, Via Ciciliano, 59/b, 00036 Palestrina (RM), P.IVA 18138881000. Per richieste privacy preliminari: infoevolvecompany@gmail.com. I riferimenti definitivi devono essere validati dal titolare o da un consulente privacy.</p>

        <h2 className="mt-8 text-2xl font-semibold">Dati raccolti tramite form</h2>
        <p className="mt-2 text-zinc-700">I form possono raccogliere nome, cognome, email, telefono facoltativo, profilo professionale, preferenze informative, uso dichiarato dell'IA, consensi, dati relativi a registrazioni evento e metadati tecnici minimi necessari alla sicurezza.</p>

        <h2 className="mt-8 text-2xl font-semibold">Dati di navigazione</h2>
        <p className="mt-2 text-zinc-700">Durante la navigazione possono essere trattati dati tecnici necessari al funzionamento del sito, come indirizzo IP nei log infrastrutturali, user agent, data e ora delle richieste e cookie tecnici.</p>

        <h2 className="mt-8 text-2xl font-semibold">Finalità e basi giuridiche</h2>
        <ul className="mt-2 list-disc space-y-1 pl-6 text-zinc-700">
          <li>Gestione di richieste, iscrizioni e comunicazioni organizzative: esecuzione di misure precontrattuali o interesse legittimo organizzativo.</li>
          <li>Invio di materiali, eventi formativi e informazioni su prodotti o servizi: consenso facoltativo ove richiesto.</li>
          <li>Sicurezza, prevenzione abusi e integrità dei sistemi: interesse legittimo e obblighi tecnici.</li>
        </ul>

        <h2 className="mt-8 text-2xl font-semibold">Conservazione, destinatari e trasferimenti</h2>
        <p className="mt-2 text-zinc-700">I dati sono conservati per il tempo necessario alle finalità indicate e riesaminati periodicamente. Possono essere trattati da fornitori tecnici come hosting, database MongoDB e provider email Resend. Eventuali trasferimenti extra UE dipendono dai fornitori adottati e devono essere verificati tramite accordi e garanzie applicabili.</p>

        <h2 className="mt-8 text-2xl font-semibold">Diritti dell'interessato</h2>
        <p className="mt-2 text-zinc-700">Puoi richiedere accesso, rettifica, cancellazione, limitazione, opposizione e portabilità nei casi previsti. Puoi inoltre revocare i consensi facoltativi senza pregiudicare la liceità del trattamento precedente.</p>

        <h2 className="mt-8 text-2xl font-semibold">Cookie</h2>
        <p className="mt-2 text-zinc-700">La gestione dei cookie è descritta nella <a href="/cookie-policy" className="font-medium text-emerald-700 underline">Cookie Policy</a>.</p>
      </article>
    </main>
  );
}
