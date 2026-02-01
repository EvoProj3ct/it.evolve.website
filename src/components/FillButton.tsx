"use client";

export function FillButton({ children }: { children: React.ReactNode }) {
    return (
        <button
            className="
        group relative inline-flex items-center justify-center
        h-14 md:h-16 min-w-52 px-10
        overflow-hidden rounded-none
        leading-none select-none
      "
        >
            {/* overlay scuro immediato per leggibilità */}
            <span
                className="
          absolute inset-0
          bg-black/0
          transition-colors duration-150
          group-hover:bg-black/35
        "
            />

            {/* FILL: scende dall'alto, base leggermente diagonale (sinistra avanti) */}
            <span
                className="
          absolute inset-0 bg-white
          [clip-path:polygon(0_0,100%_0,100%_0,0_0)]
          transition-[clip-path] duration-450 ease-out
          will-change-[clip-path]
          group-hover:[clip-path:polygon(0_0,100%_0,100%_100%,0_119%)]
        "
            />

            {/* testo */}
            <span
                className="
          relative z-10
          font-bold tracking-[0.18em]
          text-[11px] md:text-xs
          text-white
          transition-colors duration-200
          group-hover:text-black
        "
            >
        {children}
      </span>

            {/* bordo sopra (più spesso) */}
            <span className="pointer-events-none absolute inset-0 z-20 border-2 border-white/70" />
        </button>
    );
}
