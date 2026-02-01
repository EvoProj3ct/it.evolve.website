"use client";

import { FillButton } from "@/components/FillButton";

export function AboutSplit() {
    return (
        <section className="about-split">
            <div className="about-split-wrap">
                {/* LEFT: testo */}
                <div className="about-split-left">
                    {/* ✅ boxed container SOLO per il testo */}
                    <div className="about-split-left-inner">
                        <div className="about-eyebrow">Su di Noi</div>

                        <h2 className="about-title">
                            <span className="about-title-gradient">Il metodo prima della</span>
                            <br />
                            <span className="about-title-gradient">tecnologia.</span>
                        </h2>

                        <p className="about-desc">
                            Ogni progetto parte dalla comprensione del processo reale. La tecnologia è una conseguenza.
                        </p>

                        <div className="about-cta">
                            <FillButton>SCOPRI DI PIU&apos;</FillButton>
                        </div>
                    </div>
                </div>

                {/* RIGHT: immagine */}
                <div className="about-split-right">
                    <div
                        className="about-image"
                        style={{ backgroundImage: "url(/about/team.png)" }}
                    />
                </div>
            </div>
        </section>
    );
}
