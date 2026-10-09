import Link from "next/link";

export const metadata = {
  title: "Utils | Evolve",
  description: "Brochure, corsi e PDF utili di Evolve.",
};

const resources = [
  {
    id: "brochure",
    number: "01",
    title: "Brochure",
    description: "Cerchi una presentazione dei nostri servizi? Scrivici quali temi vuoi approfondire e ti indicheremo il materiale più adatto.",
    linkLabel: "Contattaci",
    href: "/contact",
  },
  {
    id: "corsi",
    number: "02",
    title: "Corsi",
    description: "Vuoi sapere quando organizziamo nuovi incontri formativi? Puoi lasciare il tuo contatto e ricevere gli aggiornamenti sulle prossime iniziative.",
    linkLabel: "Rimani aggiornato",
    href: "/rimani-aggiornato",
  },
  {
    id: "pdf-utili",
    number: "03",
    title: "PDF utili",
    description: "Qui trovi il programma dell'evento Chiedilo all'IA, disponibile da consultare e scaricare.",
    linkLabel: "Apri il programma",
    href: "/chiedilo-all-ia/cronoprogramma-evento-chiedilo-all-ia-paliano.pdf",
  },
] as const;

export default function UtilsPage() {
  return (
    <main className="min-h-screen bg-[#FCFDFB] text-[#101914]">
      <div className="mx-auto max-w-6xl px-6 pb-28 pt-32 md:px-10 md:pt-40">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#4E6553]">Evolve / Utils</p>
        <h1 className="mt-6 max-w-4xl text-5xl font-medium leading-[1.05] tracking-[-0.055em] md:text-7xl">Risorse da tenere a portata di mano.</h1>
        <p className="mt-7 max-w-2xl text-lg leading-relaxed text-[#45534A]">Materiali e occasioni per conoscere meglio il nostro lavoro e approfondire la tecnologia.</p>

        <div className="mt-16 border-t border-[#E6EBE5] md:mt-24">
          {resources.map((resource) => (
            <section key={resource.id} id={resource.id} className="grid scroll-mt-24 gap-5 border-b border-[#E6EBE5] py-10 md:grid-cols-[5rem_minmax(0,1fr)_minmax(0,1fr)] md:gap-10 md:py-12">
              <span className="pt-1 text-xs tracking-[0.2em] text-[#6C7D70]">{resource.number}</span>
              <h2 className="text-3xl font-medium tracking-[-0.045em] md:text-4xl">{resource.title}</h2>
              <div>
                <p className="max-w-md leading-relaxed text-[#45534A]">{resource.description}</p>
                <Link href={resource.href} className="mt-6 inline-flex min-h-11 items-center gap-3 border-b-2 border-[#72C94F] font-medium text-[#183D23] transition-colors hover:text-[#3B8A2C]">
                  {resource.linkLabel}
                  <svg aria-hidden="true" width="15" height="15" viewBox="0 0 15 15" fill="none">
                    <path d="M3 12 12 3M5 3h7v7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" />
                  </svg>
                </Link>
              </div>
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}
