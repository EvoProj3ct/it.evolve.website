import EventInterestForm from "@/components/chiedilo/event-interest-form";
import Image from "next/image";
import Link from "next/link";

export const metadata = {
  title: "Rimani aggiornato | Evolve",
  description: "Ricevi aggiornamenti su eventi, progetti e materiali open source Evolve. Richiedi un primo confronto gratuito di 30 minuti.",
};

export default function RimaniAggiornatoPage() {
  return (
    <main className="min-h-screen bg-[#FAFBFA] px-4 py-10 text-[#0B3D2E] sm:px-6 sm:py-12 md:py-16">
      <div className="mx-auto max-w-4xl rounded-3xl border border-[#CDE8D1] bg-white p-5 shadow-lg shadow-[#0B3D2E]/6 sm:p-8 md:p-12">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/chiedilo-all-ia/logo_nero.png" alt="Evolve" width={120} height={50} className="h-8 w-auto object-contain" priority />
          </Link>
          <Link href="/" className="inline-flex items-center justify-center rounded-full border border-[#72C94F]/30 bg-white px-4 py-2 text-sm font-semibold text-[#2C7A62] shadow-sm transition-colors hover:border-[#72C94F] hover:bg-[#ECF3E9]">
            Torna alla homepage
          </Link>
        </div>

        <p className="inline-block rounded-full border border-[#72C94F]/40 bg-[#72C94F]/10 px-4 py-1 text-sm font-semibold text-[#0B3D2E]">Evolve · aggiornamenti, materiali e confronto</p>
        <h1 className="mt-4 bg-gradient-to-r from-[#0B3D2E] via-[#2C7A62] to-[#72C94F] bg-clip-text text-3xl font-extrabold text-transparent sm:text-4xl md:text-5xl">
          Rimani aggiornato
        </h1>
        <div className="mt-4 space-y-3 text-sm leading-relaxed text-[#114928]/80 sm:text-base">
          <p>
            Lascia i tuoi dati per ricevere aggiornamenti sugli eventi Evolve, materiali pratici collegati ai progetti e informazioni sulle prossime iniziative.
          </p>
          <p>
            Se vuoi capire come applicare l&rsquo;innovazione digitale alla tua attività, puoi richiedere anche un primo confronto gratuito di 30 minuti con il team Evolve.
          </p>
        </div>

        <div className="mt-10">
          <EventInterestForm
            eventId="evolve-generale"
            sourcePage="rimani-aggiornato"
            sourceContext="evolve-rimani-aggiornato"
            introText="Inserisci nome, cognome ed email. Il numero di telefono è facoltativo e serve solo se preferisci lasciare anche un contatto diretto."
            submitLabel="Invia richiesta"
          />
        </div>
      </div>
    </main>
  );
}