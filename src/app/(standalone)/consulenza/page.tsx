import Image from "next/image";
import Link from "next/link";
import EventInterestForm from "@/components/chiedilo/event-interest-form";

export const metadata = {
  title: "Consulenza | Evolve",
  description: "Richiedi una consulenza Evolve e salva i tuoi dati in modo sicuro.",
};

export default function ConsulenzaPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-amber-50 px-4 py-10 text-zinc-900 sm:px-6 sm:py-12 md:py-16">
      <div className="mx-auto max-w-4xl rounded-3xl bg-white/90 p-5 shadow-2xl backdrop-blur sm:p-8 md:p-12">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex flex-wrap items-center gap-5">
            <Image src="/chiedilo-all-ia/logo_nero.png" alt="Evolve" width={180} height={80} className="h-9 w-auto object-contain" priority />
          </div>
          <Link href="/chiedilo-all-ia" className="inline-flex items-center justify-center rounded-full border border-emerald-200 bg-white px-4 py-2 text-sm font-semibold text-emerald-700 shadow-sm transition-colors hover:border-emerald-400 hover:bg-emerald-50">
            Vai a Chiedilo all'IA
          </Link>
        </div>

        <p className="inline-block rounded-full border border-emerald-200 bg-emerald-100 px-4 py-1 text-sm font-semibold text-emerald-800">Consulenza Evolve</p>
        <h1 className="mt-4 bg-gradient-to-r from-emerald-700 via-teal-700 to-amber-700 bg-clip-text text-3xl font-extrabold text-transparent sm:text-4xl md:text-5xl">
          Richiedi una consulenza
        </h1>
        <p className="mt-4 text-sm text-zinc-600 sm:text-base">
          Lascia i tuoi dati e le preferenze di contatto: la richiesta verra salvata nel backend MongoDB e gestita dal team Evolve.
        </p>
        <p className="mt-2 text-sm text-zinc-500">
          Useremo queste informazioni solo per ricontattarti e organizzare il primo confronto.
        </p>

        <div className="mt-10">
          <EventInterestForm
            sourcePage="consulenza"
            sourceContext="consulenza-evolve"
            introText="Inserisci nome, cognome, email e, se vuoi, un numero di telefono. La richiesta verra salvata in modo sicuro e usata per ricontattarti."
            submitLabel="Invia richiesta di consulenza"
          />
        </div>
      </div>
    </main>
  );
}
