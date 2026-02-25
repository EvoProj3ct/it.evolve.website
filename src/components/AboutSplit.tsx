"use client";

import { useEffect, useRef, useState } from "react";
import { FillButton } from "@/components/FillButton";

export function AboutSplit() {
    const sectionRef = useRef<HTMLElement | null>(null);
    const videoRef = useRef<HTMLVideoElement | null>(null);

    const [hasPlayed, setHasPlayed] = useState(false);

    useEffect(() => {
        const sectionEl = sectionRef.current;
        const videoEl = videoRef.current;
        if (!sectionEl || !videoEl) return;

        // Hard set per Safari/iOS: meglio impostarli anche via JS
        videoEl.muted = true;
        videoEl.playsInline = true;
        videoEl.pause();

        const playWhenReady = async () => {
            if (!videoEl) return;

            // forziamo caricamento quando entra in viewport
            try {
                videoEl.preload = "auto";
                videoEl.load();
            } catch {}

            // se non è pronto, aspetta canplay poi play
            const tryPlay = async () => {
                try {
                    // se era già finito per qualche motivo
                    if (videoEl.ended || videoEl.currentTime >= (videoEl.duration || 0)) {
                        videoEl.currentTime = 0;
                    }
                    await videoEl.play();
                    setHasPlayed(true);
                } catch {
                    // fallback: aspetta un attimo e riprova (alcuni browser sono rognosi)
                    setTimeout(async () => {
                        try {
                            await videoEl.play();
                            setHasPlayed(true);
                        } catch {}
                    }, 120);
                }
            };

            if (videoEl.readyState >= 2) {
                // HAVE_CURRENT_DATA
                void tryPlay();
            } else {
                const onCanPlay = () => {
                    videoEl.removeEventListener("canplay", onCanPlay);
                    void tryPlay();
                };
                videoEl.addEventListener("canplay", onCanPlay, { once: true });
            }
        };

        const io = new IntersectionObserver(
            (entries) => {
                const entry = entries[0];
                if (!entry) return;

                // appena la sezione è visibile, parte (una sola volta)
                if (entry.isIntersecting && !hasPlayed) {
                    void playWhenReady();
                }
            },
            {
                threshold: 0.15,           // più permissivo: parte “subito quando la vedi”
                rootMargin: "0px 0px -5% 0px",
            }
        );

        io.observe(sectionEl);
        return () => io.disconnect();
    }, [hasPlayed]);

    return (
        <section ref={sectionRef} className="about-split">
            <div className="about-split-wrap">
                {/* LEFT */}
                <div className="about-split-left">
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

                {/* RIGHT: VIDEO */}
                <div className="about-split-right">
                    <div className="about-media">
                        <video
                            ref={videoRef}
                            className="about-video"
                            src="/video/phantoms.mp4"
                            muted
                            playsInline
                            preload="metadata"   // IMPORTANT: mostra frame ma permette avvio rapido
                            controls={false}
                            loop={false}
                            // iOS/Safari: a volte aiuta avere poster implicito (prende il primo frame comunque)
                            onEnded={() => {
                                const v = videoRef.current;
                                if (!v) return;
                                v.pause();
                                try {
                                    v.currentTime = Math.max(0, v.duration - 0.05);
                                } catch {}
                            }}
                        />
                    </div>
                </div>
            </div>
        </section>
    );
}