import Link from "next/link";

export default function ThankYouPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-amber-50 px-4 py-16 text-zinc-900 sm:px-6">
      <div className="mx-auto max-w-3xl rounded-3xl bg-white/90 p-8 text-center shadow-2xl backdrop-blur sm:p-12">
        <p className="inline-block rounded-full border border-emerald-200 bg-emerald-100 px-4 py-1 text-sm font-semibold text-emerald-800">Chiedilo all’IA</p>
        <h1 className="mt-5 bg-gradient-to-r from-emerald-700 via-teal-700 to-amber-700 bg-clip-text text-3xl font-extrabold text-transparent sm:text-4xl md:text-5xl">
          Iscrizione ricevuta correttamente
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-zinc-700 sm:text-lg">
          Grazie, la tua richiesta di partecipazione è stata registrata. A breve riceverai via email le informazioni utili sull’evento.
        </p>
        <Link href="/" className="mt-8 inline-flex items-center justify-center rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-amber-600 px-6 py-3 text-base font-semibold text-white shadow-xl transition-all hover:scale-[1.01] sm:px-8 sm:py-4 sm:text-lg">
          Torna alla homepage
        </Link>
      </div>
    </main>
  );
}
