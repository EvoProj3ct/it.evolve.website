export default function CookiePolicyPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-amber-50 px-6 py-16">
      <div className="mx-auto max-w-4xl rounded-3xl bg-white/90 p-8 shadow-xl backdrop-blur">
        <h1 className="text-4xl font-bold">Cookie Policy</h1>
        <p className="mt-6 text-zinc-700">
          Questo sito utilizza cookie necessari e, previo consenso, cookie funzionali, analitici e marketing per gestire correttamente la navigazione della webapp evento.
        </p>
        <h2 className="mt-8 text-2xl font-semibold">Categorie</h2>
        <ul className="mt-2 list-disc space-y-1 pl-6 text-zinc-700">
          <li>Necessari: indispensabili per il funzionamento tecnico.</li>
          <li>Funzionali: migliorano esperienza e preferenze utente.</li>
          <li>Analitici: statistiche aggregate sull&apos;uso del sito.</li>
          <li>Marketing: comunicazioni e campagne personalizzate.</li>
        </ul>
        <p className="mt-6 text-zinc-700">Puoi cambiare le preferenze in qualsiasi momento dal link &quot;Preferenze cookie&quot; nel footer.</p>
      </div>
    </main>
  );
}
