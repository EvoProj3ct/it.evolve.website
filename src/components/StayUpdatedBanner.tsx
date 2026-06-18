import Link from "next/link";

export function StayUpdatedBanner() {
  return (
    <section className="relative overflow-hidden px-6 py-20" style={{ background: "#0b1118" }}>
      <div className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: "radial-gradient(circle at 25% 50%, #72C94F 0%, transparent 50%), radial-gradient(circle at 75% 50%, #2C7A62 0%, transparent 50%)",
        }}
      />
      <div className="relative mx-auto max-w-4xl rounded-3xl border border-[#72C94F]/15 bg-white/[0.04] p-8 text-center shadow-xl shadow-black/40 backdrop-blur-sm sm:p-12">
        <h2 className="text-3xl font-bold text-[#EEF2F7] sm:text-4xl">
          Rimani aggiornato
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-[#EEF2F7]/70 sm:text-lg">
          Ricevi aggiornamenti su eventi, progetti e materiali open source Evolve. Se vuoi un primo confronto gratuito di 30 minuti, saremo felici di conoscerti.
        </p>
        <Link
          href="/rimani-aggiornato"
          className="mt-8 inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-[#72C94F] via-[#578B60] to-[#2C7A62] px-6 py-3 text-base font-semibold text-white shadow-xl shadow-black/30 transition-all hover:scale-105 hover:shadow-[#72C94F]/20 sm:px-8 sm:py-4 sm:text-lg"
        >
          Scopri di pi&ugrave;
        </Link>
      </div>
    </section>
  );
}