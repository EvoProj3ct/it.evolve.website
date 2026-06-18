import {
  ArrowRight,
  CheckCircle2,
  Clock,
  Gift,
  Lightbulb,
  MessageSquare,
  ShieldCheck,
  Sparkles,
  Target,
  Users,
} from "lucide-react";
import Image from "next/image";

const programma = [
  {
    fascia: "Apertura",
    titolo: "BCC, Evolve e il valore dell’innovazione sul territorio",
    descrizione:
      "Introduzione dell’incontro, cornice territoriale e obiettivo: capire come usare l’IA in modo più chiaro, utile e consapevole.",
  },
  {
    fascia: "Primo tempo · circa 80 minuti",
    titolo: "Perché l’IA risponde meglio quando chiediamo meglio",
    descrizione:
      "Differenza tra richieste generiche e prompt costruiti con contesto, obiettivi, vincoli e formato atteso.",
  },
  {
    fascia: "Esempi guidati",
    titolo: "Da domanda vaga a prompt efficace",
    descrizione:
      "Esempi concreti e confronto guidato su come cambia la qualità della risposta quando cambia la qualità della richiesta.",
  },
  {
    fascia: "Pausa",
    titolo: "Confronto informale",
    descrizione: "Breve pausa tra la parte introduttiva e la parte applicativa.",
  },
  {
    fascia: "Secondo tempo · circa 80 minuti",
    titolo: "Prompt utili per lavoro, impresa e attività quotidiane",
    descrizione:
      "Esempi pratici per email, sintesi, organizzazione, idee, analisi, pianificazione e verifica delle risposte.",
  },
  {
    fascia: "Chiusura",
    titolo: "Domande, prossimi passi e kit post-evento",
    descrizione:
      "Spazio finale per domande e presentazione dei materiali che saranno inviati ai partecipanti nei giorni successivi.",
  },
];

const apprendimenti = [
  "Come trasformare una domanda generica in un prompt efficace.",
  "Come dare contesto all'IA prima di chiederle una risposta.",
  "Come indicare obiettivi, vincoli, tono e formato dell'output.",
  "Come correggere una risposta non soddisfacente.",
  "Come evitare errori comuni: richieste vaghe, fiducia cieca, mancanza di verifica.",
  "Come usare l'IA nel lavoro quotidiano senza perdere controllo e senso critico.",
];

const formulaPrompt = [
  { titolo: "Contesto", testo: "chi siamo, cosa stiamo facendo, qual è la situazione." },
  { titolo: "Obiettivo", testo: "cosa vogliamo ottenere." },
  { titolo: "Vincoli", testo: "limiti, tono, destinatario, lunghezza, regole." },
  { titolo: "Formato", testo: "tabella, elenco, email, sintesi, piano operativo, confronto." },
  { titolo: "Verifica", testo: "richiesta di controllare ambiguità, rischi, punti mancanti o alternative." },
];

const kit = [
  "prompt pronti da usare",
  "mini guida pratica al prompt",
  "esempi per lavoro, comunicazione e organizzazione",
  "esercizi progressivi",
  "materiali per approfondire l’uso consapevole dell’IA",
];

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-amber-50 text-zinc-900">
      <section className="relative overflow-hidden py-14 sm:py-16 md:py-20">
        <div className="absolute top-20 right-10 h-72 w-72 animate-pulse rounded-full bg-gradient-to-br from-emerald-300 to-teal-300 opacity-25 blur-3xl" />
        <div className="absolute bottom-20 left-10 h-96 w-96 rounded-full bg-gradient-to-br from-teal-300 to-zinc-300 opacity-20 blur-3xl" />
        <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mx-auto max-w-5xl text-center">
            <div className="mx-auto mb-8 max-w-3xl sm:mb-10">
              <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-8">
                <div className="flex min-h-16 flex-col items-center justify-center gap-2">
                  <span className="text-[0.62rem] font-semibold uppercase tracking-[0.22em] text-emerald-700">Promosso da</span>
                  <div className="flex h-14 items-center justify-center sm:h-16 md:h-20">
                    <Image src="/chiedilo-all-ia/logo-bcc.png" alt="BCC Paliano" width={260} height={102} className="max-h-14 w-auto object-contain drop-shadow-sm sm:max-h-16 md:max-h-20" priority />
                  </div>
                </div>
                <div className="flex min-h-16 flex-col items-center justify-center gap-2">
                  <span className="text-[0.62rem] font-semibold uppercase tracking-[0.22em] text-teal-700">Realizzato da</span>
                  <div className="flex h-14 items-center justify-center sm:h-16 md:h-20">
                    <Image src="/chiedilo-all-ia/logo_nero.png" alt="Evolve" width={260} height={102} className="max-h-12 w-auto object-contain drop-shadow-sm sm:max-h-14 md:max-h-16" priority />
                  </div>
                </div>
              </div>
            </div>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 px-4 py-2 text-white shadow-lg sm:mb-8 sm:px-5">
              <Sparkles className="h-4 w-4" />
              <span className="tracking-wide">Chiedilo all’IA · incontro pratico</span>
            </div>
            <h1 className="mb-5 text-4xl leading-tight sm:text-5xl md:mb-6 md:text-8xl">
              <span className="inline-block bg-gradient-to-r from-emerald-700 via-teal-700 to-zinc-700 bg-clip-text text-transparent md:-rotate-1">Chiedilo</span>
              <br />
              <span className="inline-block bg-gradient-to-r from-teal-700 via-emerald-600 to-zinc-700 bg-clip-text text-transparent md:rotate-1">
                all’IA
              </span>
            </h1>
            <div className="mx-auto mb-4 max-w-3xl">
              <p className="mb-3 text-xl text-gray-700 sm:mb-4 sm:text-2xl">
                Un incontro pratico per capire come dialogare con l’IA in modo chiaro, utile e consapevole.
              </p>
              <p className="text-base text-gray-600 sm:text-lg">
                L’intelligenza artificiale è entrata nel lavoro, nello studio, nella comunicazione e nelle decisioni quotidiane. Ma ottenere risposte davvero utili non dipende solo dallo strumento: dipende soprattutto da come impariamo a formulare le domande.
              </p>
              <p className="mt-4 text-base text-gray-600 sm:text-lg">
                Durante l’incontro scopriremo perché il prompt è il punto di partenza per usare l’IA con maggiore chiarezza, precisione e consapevolezza.
              </p>
            </div>
            <div className="mt-8 flex flex-col items-stretch justify-center gap-3 sm:mt-10 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
              <a
                href="/chiedilo-all-ia/partecipa"
                className="group flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-amber-600 px-6 py-3 text-white shadow-2xl transition-all hover:scale-105 hover:shadow-emerald-500/40 sm:px-8 sm:py-4"
              >
                <span className="text-base sm:text-lg">Rimani aggiornato</span>
                <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
              </a>
              <a
                href="#programma"
                className="rounded-2xl border-2 border-emerald-500 px-6 py-3 text-center text-base text-emerald-700 transition-all hover:scale-105 hover:bg-emerald-50 sm:px-8 sm:py-4 sm:text-lg"
              >
                Vedi il programma
              </a>
            </div>
          </div>
        </div>
      </section>

      <section className="relative py-14 sm:py-16 md:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mb-16 text-center">
            <h2 className="inline-block bg-gradient-to-r from-emerald-700 to-teal-700 bg-clip-text text-3xl text-transparent sm:-rotate-1 sm:text-4xl md:text-5xl">Perché partecipare</h2>
            <p className="mx-auto mt-5 max-w-3xl text-base text-gray-700 sm:mt-6 sm:text-lg">
              Molte persone hanno già provato strumenti di intelligenza artificiale. Poche, però, hanno imparato a dialogare con questi strumenti in modo davvero efficace.
            </p>
          </div>
          <div className="grid gap-8 md:grid-cols-3">
            <div className="group rounded-3xl border-4 border-teal-200 bg-white p-8 shadow-xl transition-all hover:-translate-y-2 hover:border-teal-400 hover:shadow-2xl">
              <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-600 shadow-lg transition-transform group-hover:rotate-12">
                <MessageSquare className="h-8 w-8 text-white" />
              </div>
              <h3 className="mb-4 text-2xl text-teal-700">Domande migliori</h3>
              <p className="leading-relaxed text-gray-600">Una richiesta vaga produce spesso una risposta generica. Una domanda costruita bene permette all’IA di comprendere contesto, obiettivo e risultato atteso.</p>
            </div>
            <div className="group rounded-3xl border-4 border-emerald-200 bg-white p-8 shadow-xl transition-all hover:-translate-y-2 hover:border-emerald-400 hover:shadow-2xl">
              <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-lg transition-transform group-hover:rotate-12">
                <Target className="h-8 w-8 text-white" />
              </div>
              <h3 className="mb-4 text-2xl text-emerald-600">Prompt più chiari</h3>
              <p className="leading-relaxed text-gray-600">Il prompt non è una formula magica, ma un metodo per spiegare all’IA cosa vogliamo ottenere, con quali vincoli e in quale formato.</p>
            </div>
            <div className="group rounded-3xl border-4 border-zinc-200 bg-white p-8 shadow-xl transition-all hover:-translate-y-2 hover:border-zinc-400 hover:shadow-2xl">
              <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-zinc-500 to-teal-600 shadow-lg transition-transform group-hover:rotate-12">
                <ShieldCheck className="h-8 w-8 text-white" />
              </div>
              <h3 className="mb-4 text-2xl text-zinc-700">Uso consapevole</h3>
              <p className="leading-relaxed text-gray-600">Usare l’IA significa anche saper verificare, correggere, iterare e mantenere il giudizio umano al centro.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-gradient-to-br from-teal-100 via-emerald-50 to-amber-50 py-14 sm:py-16 md:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mb-16 text-center">
            <h2 className="inline-block bg-gradient-to-r from-teal-600 to-emerald-600 bg-clip-text text-3xl text-transparent sm:text-4xl md:text-5xl">Cosa imparerai durante l’incontro</h2>
            <p className="mx-auto mt-6 max-w-3xl text-lg text-gray-700">
              L’obiettivo dell’evento è fornire le basi per iniziare a usare l’intelligenza artificiale in modo più utile, partendo dalla cosa più importante: imparare a fare richieste chiare.
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {apprendimenti.map((item, index) => (
              <div key={item} className={`rounded-2xl border-l-8 ${index % 3 === 0 ? "border-teal-500" : index % 3 === 1 ? "border-emerald-500" : "border-zinc-500"} bg-white/85 p-6 shadow-lg backdrop-blur-sm transition-all hover:-translate-y-1`}>
                <CheckCircle2 className="mb-4 h-7 w-7 text-emerald-600" />
                <p className="text-base leading-relaxed text-gray-700">{item}</p>
              </div>
            ))}
          </div>

          <div className="mt-16 rounded-3xl bg-white p-8 shadow-2xl sm:p-10">
            <div className="mb-8 text-center">
              <h2 className="inline-block bg-gradient-to-r from-emerald-700 via-teal-700 to-zinc-700 bg-clip-text text-3xl text-transparent sm:text-4xl md:text-5xl">La formula di un buon prompt</h2>
              <p className="mx-auto mt-5 max-w-3xl text-base text-gray-700 sm:text-lg">
                Un prompt efficace non deve essere complicato. Deve aiutare l’IA a capire cosa stiamo chiedendo e perché.
              </p>
            </div>
            <div className="rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-amber-600 px-5 py-6 text-center text-xl font-semibold text-white shadow-xl sm:text-2xl">
              Contesto + Obiettivo + Vincoli + Formato + Verifica
            </div>
            <div className="mt-8 grid gap-5 md:grid-cols-5">
              {formulaPrompt.map((item) => (
                <article key={item.titolo} className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-5 shadow-sm">
                  <h3 className="mb-2 text-lg font-semibold text-emerald-700">{item.titolo}</h3>
                  <p className="text-sm leading-relaxed text-zinc-600">{item.testo}</p>
                </article>
              ))}
            </div>
            <p className="mx-auto mt-8 max-w-3xl text-center text-lg font-semibold text-zinc-800">
              Prima ancora di chiedere risposte migliori, dobbiamo imparare a costruire domande migliori.
            </p>
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden py-14 sm:py-16 md:py-20">
        <div className="absolute top-0 right-0 h-96 w-96 rounded-full bg-gradient-to-br from-emerald-200 to-teal-300 opacity-20 blur-3xl" />
        <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
          <div className="text-center">
            <h2 className="inline-block bg-gradient-to-r from-teal-600 to-emerald-600 bg-clip-text text-5xl text-transparent">A chi è rivolto</h2>
            <p className="mx-auto mt-6 max-w-3xl text-lg text-gray-700">
              L’incontro è pensato per persone che vogliono avvicinarsi all’intelligenza artificiale in modo pratico, senza tecnicismi inutili ma con esempi concreti.
            </p>
          </div>
          <div className="mt-12 grid gap-8 md:grid-cols-3">
            <div className="rounded-3xl bg-gradient-to-br from-teal-500 to-teal-600 p-8 text-white shadow-2xl transition-all hover:scale-105">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-white/20"><Lightbulb className="h-6 w-6" /></div>
              <h3 className="mb-3 text-2xl font-semibold">Giovani imprenditori</h3>
              <p className="text-lg leading-relaxed">Per chi vuole capire come usare l’IA nel lavoro quotidiano e nelle prime decisioni d’impresa.</p>
            </div>
            <div className="rounded-3xl bg-gradient-to-br from-emerald-500 to-emerald-600 p-8 text-white shadow-2xl transition-all hover:scale-105">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-white/20"><Users className="h-6 w-6" /></div>
              <h3 className="mb-3 text-2xl font-semibold">Clienti BCC selezionati</h3>
              <p className="text-lg leading-relaxed">Per chi desidera orientarsi nel cambiamento digitale con un approccio accessibile e concreto.</p>
            </div>
            <div className="rounded-3xl bg-gradient-to-br from-zinc-700 via-teal-700 to-amber-700 p-8 text-white shadow-2xl transition-all hover:scale-105">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-white/20"><Sparkles className="h-6 w-6" /></div>
              <h3 className="mb-3 text-2xl font-semibold">Professionisti e realtà locali</h3>
              <p className="text-lg leading-relaxed">Per chi vuole migliorare comunicazione, organizzazione, analisi e produttività personale nell’area di Paliano e nel territorio BCC.</p>
            </div>
          </div>
        </div>
      </section>

      <section id="programma" className="relative overflow-hidden py-14 sm:py-16 md:py-20">
        <div className="absolute top-0 right-0 h-96 w-96 rounded-full bg-gradient-to-br from-emerald-200 to-teal-300 opacity-20 blur-3xl" />
        <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mb-16 text-center">
            <h2 className="inline-block bg-gradient-to-r from-emerald-700 to-teal-700 bg-clip-text text-3xl text-transparent sm:rotate-1 sm:text-4xl md:text-5xl">Programma dell’evento</h2>
            <p className="mx-auto mt-5 max-w-3xl text-base text-gray-700 sm:mt-6 sm:text-lg">
              L’incontro alterna momenti di scenario, esempi pratici, dimostrazioni e domande, con un taglio accessibile e concreto.
            </p>
          </div>
          <div className="mx-auto max-w-5xl space-y-6">
            {programma.map((slot, index) => {
              const variants = [
                { border: "border-teal-400", icon: "from-teal-500 to-emerald-600", chip: "bg-teal-100 text-teal-700", title: "text-teal-700", hoverMove: "hover:-translate-x-2" },
                { border: "border-emerald-400", icon: "from-emerald-400 to-emerald-600", chip: "bg-emerald-100 text-emerald-700", title: "text-emerald-600", hoverMove: "hover:translate-x-2" },
                { border: "border-teal-400", icon: "from-teal-400 to-teal-600", chip: "bg-teal-100 text-teal-700", title: "text-teal-600", hoverMove: "hover:-translate-x-2" },
                { border: "border-zinc-400", icon: "from-zinc-500 to-teal-600", chip: "bg-zinc-100 text-zinc-700", title: "text-zinc-700", hoverMove: "hover:translate-x-2" },
                { border: "border-emerald-500", icon: "from-emerald-500 to-emerald-700", chip: "bg-emerald-100 text-emerald-700", title: "text-emerald-600", hoverMove: "hover:-translate-x-2" },
                { border: "border-amber-500", icon: "from-amber-500 to-teal-600", chip: "bg-amber-100 text-amber-700", title: "text-amber-700", hoverMove: "hover:translate-x-2" },
              ] as const;
              const colorClasses = variants[index];

              return (
                <article key={slot.fascia} className={`group relative rounded-3xl border-l-8 ${colorClasses.border} bg-white p-5 shadow-xl transition-all hover:shadow-2xl sm:p-8 ${colorClasses.hoverMove}`}>
                  <div className="flex items-start gap-4 sm:gap-6">
                    <div className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${colorClasses.icon} text-white shadow-lg sm:h-16 sm:w-16`}>
                      {index === 0 && <Clock className="h-8 w-8" />}
                      {index === 1 && <Target className="h-8 w-8" />}
                      {index === 2 && <MessageSquare className="h-8 w-8" />}
                      {index === 3 && <Users className="h-8 w-8" />}
                      {index === 4 && <Lightbulb className="h-8 w-8" />}
                      {index === 5 && <Sparkles className="h-8 w-8" />}
                    </div>
                    <div className="flex-1">
                      <div className={`mb-3 inline-block rounded-full px-4 py-1 ${colorClasses.chip}`}>{slot.fascia}</div>
                      <h3 className={`mb-2 text-xl sm:text-2xl ${colorClasses.title}`}>{slot.titolo}</h3>
                      <p className="leading-relaxed text-gray-600">{slot.descrizione}</p>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="bg-gradient-to-br from-zinc-100 via-emerald-50 to-amber-50 py-14 sm:py-16 md:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mb-20 grid gap-12 lg:grid-cols-2">
            <div className="rounded-3xl bg-white p-10 shadow-2xl transition-all hover:scale-105">
              <div className="mb-6 inline-block rounded-full bg-gradient-to-r from-emerald-600 via-teal-600 to-amber-600 px-4 py-2 text-white">
                <Sparkles className="mr-2 inline h-5 w-5" />
                <span>Kit post-evento</span>
              </div>
              <h2 className="mb-6 bg-gradient-to-r from-emerald-700 via-teal-700 to-amber-700 bg-clip-text text-4xl text-transparent sm:text-5xl">Il kit pratico dopo l’evento</h2>
              <p className="mb-6 text-lg leading-relaxed text-gray-700">
                Nei giorni successivi all’incontro, i partecipanti riceveranno via email un kit pratico per continuare a sperimentare in autonomia.
              </p>
              <ul className="space-y-3 text-gray-700">
                {kit.map((item) => (
                  <li key={item} className="flex gap-3">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-emerald-600" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-6 text-sm text-zinc-500">Il kit includerà anche materiali avanzati per chi desidera sperimentare oltre il livello introduttivo.</p>
            </div>
            <div className="rounded-3xl bg-gradient-to-br from-teal-600 via-emerald-600 to-zinc-700 p-10 text-white shadow-2xl transition-all hover:rotate-2">
              <div className="mb-6 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20"><ShieldCheck className="h-6 w-6" /></div>
                <h3 className="text-3xl">Un metodo per usare l’IA con maggiore consapevolezza</h3>
              </div>
              <p className="text-lg leading-relaxed">
                L’incontro si inserisce nell’approccio SMART di Evolve: un modo progressivo per passare dalla semplice curiosità verso l’intelligenza artificiale a un utilizzo più chiaro, responsabile e applicabile ai contesti reali.
              </p>
              <p className="mt-6 text-lg leading-relaxed">
                Non serve essere esperti per iniziare a usare l’IA. Serve però imparare a chiederle le cose nel modo giusto.
              </p>
            </div>
          </div>

          <div className="mb-16 rounded-3xl border border-amber-200 bg-white p-8 shadow-2xl sm:p-10">
            <div className="flex flex-col gap-6 md:flex-row md:items-center">
              <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-emerald-500 text-white shadow-lg">
                <Gift className="h-8 w-8" />
              </div>
              <div>
                <p className="mb-3 inline-block rounded-full bg-amber-100 px-4 py-1 text-sm font-semibold text-amber-700">Welcome bag</p>
                <h2 className="text-3xl font-semibold text-zinc-900">Un piccolo benvenuto per ogni partecipante</h2>
                <p className="mt-3 text-lg leading-relaxed text-zinc-600">
                  All’ingresso dell’evento ogni partecipante riceverà una welcome bag con informazioni sull’incontro, materiali su Evolve e un piccolo gadget in regalo.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-16 rounded-3xl border border-emerald-200 bg-white p-6 text-center shadow-xl sm:p-10">
            <h3 className="text-2xl font-bold text-zinc-900 sm:text-3xl">Vuoi ricevere aggiornamenti sull’iniziativa?</h3>
            <p className="mx-auto mt-4 max-w-3xl text-base text-zinc-600 sm:text-lg">
              Compila il modulo per manifestare interesse o ricevere aggiornamenti sull’incontro “Chiedilo all’IA”.
            </p>
            <a
              href="/chiedilo-all-ia/partecipa"
              className="mt-8 inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-zinc-700 px-6 py-3 text-base font-semibold text-white shadow-2xl transition-all hover:scale-105 sm:px-8 sm:py-4 sm:text-lg"
            >
              Rimani aggiornato
              <ArrowRight className="h-5 w-5" />
            </a>
            <p className="mx-auto mt-5 max-w-2xl text-sm text-zinc-500">
              I partecipanti riceveranno nei giorni successivi anche il kit pratico con prompt, esempi ed esercizi.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
