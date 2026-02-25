"use client";

import { useEffect, useRef, useState } from "react";
import { FillButton } from "@/components/FillButton";

export function AboutSplit() {
    const sectionRef = useRef<HTMLElement | null>(null);

    const [isInView, setIsInView] = useState(false);

    // rimonta il player quando rientra
    const [mountKey, setMountKey] = useState(0);

    // crossfade
    const [playerReady, setPlayerReady] = useState(false);

    // audio
    const [audioOn, setAudioOn] = useState(false);

    // refs
    const posterRef = useRef<HTMLVideoElement | null>(null);
    const playerRef = useRef<HTMLVideoElement | null>(null);

    useEffect(() => {
        const sectionEl = sectionRef.current;
        if (!sectionEl) return;

        const io = new IntersectionObserver(
            (entries) => {
                const entry = entries[0];
                if (!entry) return;

                if (entry.isIntersecting) {
                    setIsInView(true);
                    setPlayerReady(false);
                    setMountKey((k) => k + 1);
                } else {
                    // esci → reset così al rientro riparte
                    setIsInView(false);
                    setPlayerReady(false);
                }
            },
            { threshold: 0.2, rootMargin: "0px 0px -10% 0px" }
        );

        io.observe(sectionEl);
        return () => io.disconnect();
    }, []);

    // Se l’utente fa un gesto qualsiasi, possiamo sbloccare audio (se lo desidera)
    useEffect(() => {
        const unlock = async () => {
            if (!audioOn) return;
            const v = playerRef.current;
            if (!v) return;

            try {
                v.muted = false;
                // se era stato bloccato per qualche motivo, riprova play dopo gesture
                await v.play().catch(() => {});
            } catch {}
        };

        window.addEventListener("pointerdown", unlock, { once: true });
        return () => window.removeEventListener("pointerdown", unlock);
    }, [audioOn]);

    const toggleAudio = async () => {
        setAudioOn((cur) => !cur);

        const v = playerRef.current;
        if (!v) return;

        const next = !audioOn;
        try {
            v.muted = !next;
            if (next) {
                // dopo click dell’utente: possiamo anche forzare play (in caso fosse in pausa)
                await v.play().catch(() => {});
            }
        } catch {}
    };

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

                {/* RIGHT */}
                <div className="about-split-right">
                    <div className="about-media">
                        {/* POSTER layer: sempre visibile, niente nero */}
                        <video
                            ref={posterRef}
                            className={["about-video", "about-video-poster", isInView && playerReady ? "is-hidden" : ""].join(" ")}
                            src="/video/phantoms.mp4"
                            muted
                            playsInline
                            preload="metadata"
                            controls={false}
                        />

                        {/* PLAYER layer: viene montato solo quando in viewport; fade-in quando playing */}
                        {isInView && (
                            <video
                                key={mountKey}
                                ref={playerRef}
                                className={["about-video", "about-video-player", playerReady ? "is-ready" : ""].join(" ")}
                                src="/video/phantoms.mp4"
                                playsInline
                                preload="auto"
                                controls={false}
                                loop={false}
                                autoPlay
                                muted={!audioOn} // autoplay richiede muted, poi lo togliamo via click
                                onPlaying={() => setPlayerReady(true)}
                                onCanPlay={() => {
                                    // a volte playing arriva tardi: canplay aiuta a preparare il fade
                                    // non settiamo ready qui per evitare flash: ready quando parte davvero
                                }}
                                onEnded={(e) => {
                                    const v = e.currentTarget;
                                    v.pause();
                                    try {
                                        v.currentTime = Math.max(0, v.duration - 0.05);
                                    } catch {}
                                }}
                            />
                        )}


                    </div>
                </div>
            </div>
        </section>
    );
}