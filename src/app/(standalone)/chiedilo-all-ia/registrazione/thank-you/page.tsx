import Link from "next/link";

export const metadata = {
  title: "Iscrizione ricevuta | Chiedilo all'IA",
};

export default function RegistrationThankYouPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-amber-50 px-4 py-16 text-zinc-900 sm:px-6">
      <div className="mx-auto max-w-3xl rounded-3xl bg-white/90 p-8 text-center shadow-2xl backdrop-blur sm:p-12">
        <p className="inline-block rounded-full border border-emerald-200 bg-emerald-100 px-4 py-1 text-sm font-semibold text-emerald-800">Chiedilo all'IA</p>
        <h1 className="mt-5 bg-gradient-to-r from-emerald-700 via-teal-700 to-amber-700 bg-clip-text text-3xl font-extrabold text-transparent sm:text-4xl md:text-5xl">
          Iscrizione ricevuta
        </h1>
        <div className="mx-auto mt-5 max-w-2xl space-y-3 text-base leading-relaxed text-zinc-700 sm:text-lg">
          <p>La tua iscrizione all'evento Chiedilo all'IA è stata registrata correttamente.</p>
          <p>Ti abbiamo inviato una email di conferma all'indirizzo indicato.</p>
          <p>Grazie,<br />Team Evolve</p>
        </div>
        <Link href="/chiedilo-all-ia" className="mt-8 inline-flex items-center justify-center rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-amber-600 px-6 py-3 text-base font-semibold text-white shadow-xl transition-all hover:scale-[1.01] sm:px-8 sm:py-4 sm:text-lg">
          Torna alla homepage
        </Link>
      </div>
    </main>
  );
}
