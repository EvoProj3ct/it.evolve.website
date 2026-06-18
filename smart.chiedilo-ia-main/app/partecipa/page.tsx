import EventInterestForm from "@/app/components/event-interest-form";
import Link from "next/link";
import Image from "next/image";

export default function PartecipaPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-amber-50 px-4 py-10 text-zinc-900 sm:px-6 sm:py-12 md:py-16">
      <div className="mx-auto max-w-4xl rounded-3xl bg-white/90 p-5 shadow-2xl backdrop-blur sm:p-8 md:p-12">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex flex-wrap items-center gap-5">
            <Image src="/logo-bcc.png" alt="BCC" width={180} height={80} className="h-10 w-auto object-contain" />
            <div className="h-9 w-px bg-zinc-200" />
            <Image src="/logo_nero.png" alt="Evolve" width={180} height={80} className="h-9 w-auto object-contain" />
          </div>
          <Link href="/" className="inline-flex items-center justify-center rounded-full border border-emerald-200 bg-white px-4 py-2 text-sm font-semibold text-emerald-700 shadow-sm transition-colors hover:border-emerald-400 hover:bg-emerald-50">
            Torna alla homepage
          </Link>
        </div>
        <p className="inline-block rounded-full border border-emerald-200 bg-emerald-100 px-4 py-1 text-sm font-semibold text-emerald-800">Chiedilo all’IA · aggiornamenti e materiali</p>
        <h1 className="mt-4 bg-gradient-to-r from-emerald-700 via-teal-700 to-amber-700 bg-clip-text text-3xl font-extrabold text-transparent sm:text-4xl md:text-5xl">
          Ricevi aggiornamenti su Chiedilo all’IA
        </h1>
        <p className="mt-4 text-sm text-zinc-600 sm:text-base">
          Lascia i tuoi dati per ricevere informazioni sull’iniziativa, materiali pratici collegati all’incontro e aggiornamenti su eventuali nuove occasioni formative realizzate da Evolve.
        </p>
        <p className="mt-2 text-sm text-zinc-500">
          Questo modulo non conferma la partecipazione a un evento specifico. Per le iscrizioni ufficiali verranno usati canali dedicati.
        </p>

        <div className="mt-10">
          <EventInterestForm />
        </div>
      </div>
    </main>
  );
}
