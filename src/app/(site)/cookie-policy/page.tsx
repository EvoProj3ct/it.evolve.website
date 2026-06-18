import { CookiePreferencesButton } from "@/components/legal/cookie-preferences-button";

export const metadata = {
  title: "Cookie Policy | Evolve",
  description: "Informazioni sui cookie tecnici e sulle categorie predisposte ma non utilizzate nella webapp Evolve.",
};

export default function CookiePolicyPage() {
  return (
    <main className="theme-light min-h-screen px-6 py-28 text-zinc-900">
      <article className="mx-auto max-w-4xl rounded-3xl bg-white p-8 shadow-xl ring-1 ring-zinc-200 sm:p-10">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-700">Cookie Policy</p>
        <h1 className="mt-3 text-4xl font-bold">Cookie e tecnologie simili</h1>
        <p className="mt-6 text-zinc-700">Ultimo aggiornamento: 18 giugno 2026. La webapp usa cookie tecnici necessari. Al momento non usa cookie analytics, marketing o di profilazione e non carica strumenti equivalenti di tracciamento.</p>

        <h2 className="mt-8 text-2xl font-semibold">Cookie tecnici necessari</h2>
        <p className="mt-2 text-zinc-700">Il cookie tecnico <code className="rounded bg-zinc-100 px-1 py-0.5">evolve_cookie_consent</code> conserva la scelta sulle preferenze cookie in modo versionato per circa 6 mesi.</p>

        <h2 className="mt-8 text-2xl font-semibold">Categorie predisposte ma non usate</h2>
        <ul className="mt-2 list-disc space-y-1 pl-6 text-zinc-700">
          <li>Preferenze: non utilizzate al momento.</li>
          <li>Analytics: non utilizzati al momento.</li>
          <li>Marketing e profilazione: non utilizzati al momento.</li>
        </ul>

        <h2 className="mt-8 text-2xl font-semibold">Modifica preferenze</h2>
        <p className="mt-2 text-zinc-700">Puoi riaprire il pannello preferenze dal pulsante seguente o dai link presenti nel footer.</p>
        <CookiePreferencesButton className="mt-4 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:from-emerald-700 hover:to-teal-700" />

        <h2 className="mt-8 text-2xl font-semibold">Evoluzioni future</h2>
        <p className="mt-2 text-zinc-700">Se in futuro venissero introdotte categorie non tecniche, analytics o marketing, la cookie policy e il pannello preferenze dovranno essere aggiornati prima dell'attivazione.</p>
      </article>
    </main>
  );
}
