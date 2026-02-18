"use client";

import React from "react";

export function ClientsTape() {
    // ripeto il testo più volte per riempire sempre la riga
    const label = "I Nostri Clienti";

    return (
        <section className="clientsTape-section" aria-label="I Nostri Clienti">
            <div className="clientsTape-track" aria-hidden>
                <div className="clientsTape-row">
                    {Array.from({ length: 10 }).map((_, idx) => (
                        <span key={`a-${idx}`} className="clientsTape-word">
              {label}
            </span>
                    ))}
                </div>

                {/* seconda riga duplicata per loop perfetto */}
                <div className="clientsTape-row">
                    {Array.from({ length: 10 }).map((_, idx) => (
                        <span key={`b-${idx}`} className="clientsTape-word">
              {label}
            </span>
                    ))}
                </div>
            </div>
        </section>
    );
}
