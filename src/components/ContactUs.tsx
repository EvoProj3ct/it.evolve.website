"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { RouletteTitle } from "./RouletteTitle";

type Accent = "blue" | "purple" | "yellow";

function accentToCss(a: Accent) {
    if (a === "yellow") return "var(--accent-yellow)";
    if (a === "purple") return "var(--accent-purple)";
    return "var(--accent-blue)";
}

function prefersReducedMotion() {
    if (typeof window === "undefined") return false;
    return window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;
}

/**
 * ✅ LOCK ON DOWN:
 * - enters -> add .isIn (stays while scrolling down)
 * ✅ REPLAY ONLY ON UP:
 * - only when scrolling UP and element is fully offscreen ABOVE -> remove .isIn + reverse direction flags
 */
function useLockRevealReverse(rootRef?: React.RefObject<HTMLElement | null>) {
    useEffect(() => {
        if (typeof window === "undefined") return;

        const root = rootRef?.current ?? document.documentElement;
        const els = Array.from(root.querySelectorAll<HTMLElement>(".reveal"));
        if (!els.length) return;

        if (prefersReducedMotion()) {
            els.forEach((el) => el.classList.add("isIn"));
            return;
        }

        let lastY = window.scrollY;
        let dir: "down" | "up" = "down";

        const io = new IntersectionObserver(
            (entries) => {
                for (const e of entries) {
                    if (!e.isIntersecting) continue;
                    const el = e.target as HTMLElement;

                    el.classList.add("isIn");
                    // once entered, clear reverse flag so it stays stable on down
                    el.removeAttribute("data-reveal-up");
                }
            },
            { root: null, threshold: 0.12, rootMargin: "0px 0px -12% 0px" }
        );

        els.forEach((el) => io.observe(el));

        const onScroll = () => {
            const y = window.scrollY;
            dir = y < lastY ? "up" : "down";
            lastY = y;
            if (dir !== "up") return;

            for (const el of els) {
                const r = el.getBoundingClientRect();
                const offscreenAbove = r.bottom < -24;
                if (!offscreenAbove) continue;

                el.classList.remove("isIn");
                // mark reverse entry for next time it comes into view (scrolling up)
                el.setAttribute("data-reveal-up", "1");
            }
        };

        window.addEventListener("scroll", onScroll, { passive: true });

        return () => {
            window.removeEventListener("scroll", onScroll);
            io.disconnect();
        };
    }, [rootRef]);
}

function IconMail() {
    return (
        <svg viewBox="0 0 24 24" className="contactMini-icon" aria-hidden="true">
            <path d="M4.5 7.5h15v9h-15z" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" />
            <path d="M5 8l7 6 7-6" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" />
        </svg>
    );
}

function IconPin() {
    return (
        <svg viewBox="0 0 24 24" className="contactMini-icon" aria-hidden="true">
            <path
                d="M12 21s6-5.1 6-11a6 6 0 1 0-12 0c0 5.9 6 11 6 11Z"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinejoin="round"
            />
            <path
                d="M12 10.5a1.6 1.6 0 1 0 0-3.2 1.6 1.6 0 0 0 0 3.2Z"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
            />
        </svg>
    );
}

export default function ContactPage() {
    const email = "infoevolvecompany@gmail.com";
    const phone = "+39 3920377932 Gianmarco";

    const cardsWrapRef = useRef<HTMLDivElement | null>(null);
    const firstCardRef = useRef<HTMLDivElement | null>(null);

    const videoRef = useRef<HTMLVideoElement | null>(null);

    const [padTop, setPadTop] = useState(0);
    const [railH, setRailH] = useState(0);

    const [rouletteTrigger, setRouletteTrigger] = useState(0);
    const rouletteStarted = useRef(false);

    // ✅ attach reveal behavior to the page
    const pageRef = useRef<HTMLElement | null>(null);
    useLockRevealReverse(pageRef);

    // Contact form state (no backend: builds a mailto)
    const [form, setForm] = useState({ name: "", company: "", from: "", message: "" });
    const [touched, setTouched] = useState(false);

    const isValidEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
    const canSubmit = form.name.trim().length > 1 && isValidEmail(form.from) && form.message.trim().length > 5;

    const onSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setTouched(true);
        if (!canSubmit) return;

        const subject = `Richiesta di contatto${form.company.trim() ? ` — ${form.company.trim()}` : ""}`;
        const body = [
            `Nome: ${form.name.trim()}`,
            form.company.trim() ? `Azienda: ${form.company.trim()}` : null,
            `Email: ${form.from.trim()}`,
            "",
            form.message.trim(),
        ]
            .filter(Boolean)
            .join("\n");

        const href = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        window.location.href = href;
    };

    useEffect(() => {
        if (rouletteStarted.current) return;
        rouletteStarted.current = true;
        const id = window.setTimeout(() => setRouletteTrigger((v) => v + 1), 260);
        return () => window.clearTimeout(id);
    }, []);

    useEffect(() => {
        const wrap = cardsWrapRef.current;
        const first = firstCardRef.current;
        if (!wrap || !first) return;

        const readGapPx = () => {
            const cs = window.getComputedStyle(wrap);
            const rowGap = cs.rowGap || cs.gap || "0px";
            const n = Number.parseFloat(rowGap);
            return Number.isFinite(n) ? n : 0;
        };

        const compute = () => {
            const gapPx = readGapPx();
            const firstH = first.getBoundingClientRect().height;
            const wrapH = wrap.getBoundingClientRect().height;

            const p = Math.ceil(firstH + gapPx);
            setPadTop(p);
            setRailH(Math.max(0, Math.ceil(wrapH - p)));
        };

        compute();

        const ro = new ResizeObserver(compute);
        ro.observe(first);
        ro.observe(wrap);

        window.addEventListener("resize", compute);
        return () => {
            ro.disconnect();
            window.removeEventListener("resize", compute);
        };
    }, []);

    useEffect(() => {
        const v = videoRef.current;
        if (!v) return;
        v.currentTime = 0;
        v.play().catch(() => {});
    }, []);

    return (
        <main ref={pageRef as any} className="contactMini">
            {/* HERO */}
            <section className="contactMini-hero" aria-label="Contatti">
                <div className="contactMini-bg" aria-hidden="true" />

                <div className="contactMini-wrap">
                    {/* ✅ same reveal as previous section */}
                    <div className="contactMini-pill reveal" data-reveal="left">
                        CONTATTI
                    </div>

                    <h1 className="contactMini-title reveal" data-reveal="left">
                        <RouletteTitle
                            text={"Parliamo della tua idea."}
                            triggerKey={rouletteTrigger}
                            picks={3}
                            durationMs={2600}
                            tickMinMs={80}
                            tickMaxMs={420}
                            stopFractions={[0.64, 0.84, 1]}
                            className="whitespace-pre-wrap"
                        />
                    </h1>
                </div>
            </section>

            {/* BODY */}
            <section className="contactMini-body" aria-label="Dettagli contatto">
                <div className="contactMini-wrap contactMini-grid">
                    {/* LEFT */}
                    <div
                        className="contactMini-left contactLeftWithVideo reveal"
                        data-reveal="left"
                        style={
                            padTop
                                ? ({
                                    paddingTop: padTop,
                                    minHeight: railH || undefined,
                                    display: "flex",
                                    flexDirection: "column",
                                    justifyContent: "space-between",
                                } as React.CSSProperties)
                                : undefined
                        }
                    >
                        <div className="contactLeftVideo" aria-hidden="true">
                            <div className="contactLeftVideo-media">
                                <video
                                    ref={videoRef}
                                    className="contactLeftVideo-video"
                                    src="/video/phantomsend.mp4"
                                    autoPlay
                                    muted
                                    playsInline
                                    preload="auto"
                                    loop={false}
                                />
                                <div className="contactLeftVideo-whiteMask" aria-hidden="true" />
                            </div>
                        </div>

                        {/* ✅ Contact form (replaces “Scrivici quando vuoi.” section) */}
                        <div className="contactMini-formWrap" style={{ display: "grid", gap: 12 }}>
                            <h2 className="contactMini-h2">Scrivici quando vuoi.</h2>

                            <form className="contactMini-form" onSubmit={onSubmit} noValidate>
                                <div className="contactMini-formGrid">
                                    <label className="contactMini-field">
                                        <span className="contactMini-label">Nome</span>
                                        <input
                                            className="contactMini-input"
                                            value={form.name}
                                            onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
                                            onBlur={() => setTouched(true)}
                                            placeholder="Come ti chiami?"
                                            autoComplete="name"
                                        />
                                        {touched && form.name.trim().length <= 1 ? (
                                            <span className="contactMini-error">Inserisci il tuo nome.</span>
                                        ) : null}
                                    </label>

                                    <label className="contactMini-field">
                                        <span className="contactMini-label">Azienda</span>
                                        <input
                                            className="contactMini-input"
                                            value={form.company}
                                            onChange={(e) => setForm((s) => ({ ...s, company: e.target.value }))}
                                            placeholder="Facoltativo"
                                            autoComplete="organization"
                                        />
                                    </label>

                                    <label className="contactMini-field contactMini-fieldFull">
                                        <span className="contactMini-label">Email</span>
                                        <input
                                            className="contactMini-input"
                                            value={form.from}
                                            onChange={(e) => setForm((s) => ({ ...s, from: e.target.value }))}
                                            onBlur={() => setTouched(true)}
                                            placeholder="nome@azienda.com"
                                            autoComplete="email"
                                            inputMode="email"
                                        />
                                        {touched && !isValidEmail(form.from) ? (
                                            <span className="contactMini-error">Inserisci un’email valida.</span>
                                        ) : null}
                                    </label>

                                    <label className="contactMini-field contactMini-fieldFull">
                                        <span className="contactMini-label">Messaggio</span>
                                        <textarea
                                            className="contactMini-textarea"
                                            value={form.message}
                                            onChange={(e) => setForm((s) => ({ ...s, message: e.target.value }))}
                                            onBlur={() => setTouched(true)}
                                            placeholder="Raccontaci cosa vuoi costruire, in breve."
                                            rows={5}
                                        />
                                        {touched && form.message.trim().length <= 5 ? (
                                            <span className="contactMini-error">Scrivi due righe sul tuo progetto.</span>
                                        ) : null}
                                    </label>
                                </div>

                                <div className="contactMini-formActions">
                                    <button
                                        type="submit"
                                        className="contactMini-cta contactMini-ctaBtn"
                                        style={{ ["--cta-accent" as any]: accentToCss("blue") } as React.CSSProperties}
                                        onClick={() => setTouched(true)}
                                        aria-disabled={!canSubmit}
                                    >
                                        Invia
                                    </button>

                                    <span className="contactMini-formHint">
                    Inviando, aprirai la tua app email con il messaggio già pronto.
                  </span>
                                </div>
                            </form>
                        </div>

                        <div className="contactMini-ctaRow" style={{ marginTop: 18 }}>
                            <Link
                                className="contactMini-cta isGhost"
                                href="/portfolio"
                                style={{ ["--cta-accent" as any]: accentToCss("purple") } as React.CSSProperties}
                            >
                                Vedi portfolio
                            </Link>
                        </div>
                    </div>

                    {/* RIGHT */}
                    <div ref={cardsWrapRef} className="contactMini-cards reveal" data-reveal="right">
                        {/* ✅ Split card: half phone / half email */}
                        <div
                            ref={firstCardRef}
                            className="contactMini-card contactMini-cardSplit"
                            style={{ ["--card-accent" as any]: accentToCss("yellow") } as React.CSSProperties}
                        >
                            <div className="contactMini-cardTop">
                                <IconMail />
                            </div>

                            <div className="contactMini-cardBody contactMini-splitBody">
                                <div className="contactMini-splitHalf">
                                    <div className="contactMini-cardTitle">Chiamaci</div>
                                    <a className="contactMini-link" href={`tel:${phone.replace(/\s+/g, "")}`}>
                                        {phone}
                                    </a>
                                </div>

                                <div className="contactMini-splitDivider" aria-hidden="true" />

                                <div className="contactMini-splitHalf">
                                    <div className="contactMini-cardTitle">Scrivici</div>
                                    <a className="contactMini-link" href={`mailto:${email}`}>
                                        {email}
                                    </a>
                                </div>
                            </div>

                            <span className="contactMini-accentLine" aria-hidden="true" />
                        </div>

                        {/* ✅ Replace “Location” content with Leo CTA */}
                        <div
                            className="contactMini-card"
                            style={{ ["--card-accent" as any]: accentToCss("blue") } as React.CSSProperties}
                        >
                            <div className="contactMini-cardTop">
                                <IconPin />
                            </div>

                            <div className="contactMini-cardBody">
                                <div className="contactMini-cardTitle">Hai già provato il nostro agente IA?</div>
                                <div className="contactMini-muted">
                                    Dai un&apos;occhiata all&apos;icona della chat sulla barra di navigazione e fatti una chiacchiera con
                                    Leo; potrà aiutarti a farti un&apos;idea più precisa di cosa abbiamo in serbo per te o come possiamo
                                    aiutarti!
                                </div>
                            </div>

                            <span className="contactMini-accentLine" aria-hidden="true" />
                        </div>
                    </div>
                </div>
            </section>

            <style jsx global>{`
        /* =========================================================
           REVEAL (lock on down, replay only on up, reverse direction)
           ========================================================= */

        .reveal {
          opacity: 0;
          transform: translate3d(0, 18px, 0);
          transition: transform 700ms cubic-bezier(0.2, 0.8, 0.2, 1),
            opacity 700ms cubic-bezier(0.2, 0.8, 0.2, 1),
            filter 700ms cubic-bezier(0.2, 0.8, 0.2, 1);
          will-change: transform, opacity, filter;
          filter: blur(10px);
        }

        .reveal[data-reveal="left"] {
          transform: translate3d(-36px, 18px, 0);
        }
        .reveal[data-reveal="right"] {
          transform: translate3d(36px, 18px, 0);
        }

        /* reverse on replay (scroll-up) */
        .reveal[data-reveal="left"][data-reveal-up="1"] {
          transform: translate3d(36px, 18px, 0);
        }
        .reveal[data-reveal="right"][data-reveal-up="1"] {
          transform: translate3d(-36px, 18px, 0);
        }

        .reveal.isIn {
          opacity: 1;
          transform: translate3d(0, 0, 0);
          filter: blur(0);
        }

        @media (prefers-reduced-motion: reduce) {
          .reveal {
            opacity: 1 !important;
            transform: none !important;
            transition: none !important;
            filter: none !important;
          }
        }

        /* Mobile: niente offset */
        @media (max-width: 1023px) {
          .contactMini-left {
            padding-top: 0 !important;
            min-height: auto !important;
            display: block !important;
          }
          .contactMini-ctaRow {
            margin-top: 22px !important;
          }
        }

        /* ======================================================
           VIDEO INCASELLATO SOPRA “Scrivici quando vuoi.” (SINISTRA)
           ====================================================== */
        :root {
          --leftVideoH: min(28vh, 240px);
        }

        .contactLeftWithVideo {
          position: relative;
          padding-top: calc(var(--leftVideoH) + 18px);
        }

        .contactLeftVideo {
          position: absolute;
          left: 0;
          right: 0;
          top: 0;
          height: var(--leftVideoH);
          pointer-events: none;
          z-index: 0;
        }

        .contactLeftVideo-media {
          position: relative;
          width: 100%;
          height: 100%;
          overflow: hidden;

          -webkit-mask-image: linear-gradient(to bottom, transparent 0%, #000 12%, #000 88%, transparent 100%),
            linear-gradient(to right, transparent 0%, #000 8%, #000 92%, transparent 100%);
          mask-image: linear-gradient(to bottom, transparent 0%, #000 12%, #000 88%, transparent 100%),
            linear-gradient(to right, transparent 0%, #000 8%, #000 92%, transparent 100%);
          -webkit-mask-composite: source-in;
          mask-composite: intersect;
        }

        .contactLeftVideo-video {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: 50% 18%;
          transform: scale(1.02);
          transform-origin: center;
          user-select: none;
        }

        .contactLeftVideo-whiteMask {
          position: absolute;
          inset: 0;
          pointer-events: none;
          background: linear-gradient(
              180deg,
              rgba(255, 255, 255, 0.92) 0%,
              rgba(255, 255, 255, 0.58) 38%,
              rgba(255, 255, 255, 0.22) 72%,
              rgba(255, 255, 255, 0) 100%
            ),
            radial-gradient(1200px 520px at 50% 35%, rgba(255, 255, 255, 0.55) 0%, rgba(255, 255, 255, 0) 70%);
          mix-blend-mode: screen;
          opacity: 1;
        }

        /* contenuto sopra al video */
        .contactLeftWithVideo > *:not(.contactLeftVideo) {
          position: relative;
          z-index: 1;
        }

        @media (max-width: 640px) {
          :root {
            --leftVideoH: min(22vh, 190px);
          }
          .contactLeftVideo-video {
            object-position: 50% 16%;
          }
        }

        /* ======================================================
           CONTACT FORM (coherent with existing style)
           ====================================================== */

        .contactMini-formWrap {
          max-width: 560px;
        }

        .contactMini-form {
          display: grid;
          gap: 14px;
          margin-top: 8px;
        }

        .contactMini-formGrid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }

        .contactMini-field {
          display: grid;
          gap: 7px;
        }

        .contactMini-fieldFull {
          grid-column: 1 / -1;
        }

        .contactMini-label {
          font-size: 12px;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          opacity: 0.7;
        }

        .contactMini-input,
        .contactMini-textarea {
          width: 100%;
          border: 1px solid rgba(0, 0, 0, 0.12);
          background: rgba(255, 255, 255, 0.62);
          border-radius: 12px;
          padding: 12px 12px;
          outline: none;
          transition: border-color 160ms ease, box-shadow 160ms ease, background 160ms ease;
        }

        .contactMini-textarea {
          resize: vertical;
          min-height: 120px;
        }

        .contactMini-input:focus,
        .contactMini-textarea:focus {
          border-color: rgba(0, 0, 0, 0.22);
          box-shadow: 0 0 0 6px rgba(0, 0, 0, 0.04);
          background: rgba(255, 255, 255, 0.78);
        }

        .contactMini-error {
          font-size: 12px;
          opacity: 0.85;
        }

        .contactMini-formActions {
          display: flex;
          align-items: center;
          gap: 14px;
          flex-wrap: wrap;
          margin-top: 2px;
        }

        .contactMini-ctaBtn {
          border: 0;
          cursor: pointer;
        }

        .contactMini-ctaBtn[aria-disabled="true"] {
          opacity: 0.55;
          cursor: not-allowed;
        }

        .contactMini-formHint {
          font-size: 13px;
          opacity: 0.65;
        }

        @media (max-width: 640px) {
          .contactMini-formGrid {
            grid-template-columns: 1fr;
          }
          .contactMini-formHint {
            width: 100%;
          }
        }

        /* ======================================================
           SPLIT CARD (phone | email, split in half width)
           ====================================================== */

        .contactMini-cardSplit .contactMini-splitBody {
          display: grid;
          grid-template-columns: 1fr 1px 1fr;
          gap: 0;
          align-items: stretch;
          padding-top: 2px;
        }

        .contactMini-splitHalf {
          display: grid;
          gap: 8px;
          padding: 10px 0;
        }

        .contactMini-splitHalf:first-child {
          padding-right: 14px;
        }

        .contactMini-splitHalf:last-child {
          padding-left: 14px;
        }

        .contactMini-splitDivider {
          background: rgba(0, 0, 0, 0.08);
          border-radius: 999px;
          width: 1px;
        }

        @media (max-width: 520px) {
          .contactMini-cardSplit .contactMini-splitBody {
            grid-template-columns: 1fr;
          }
          .contactMini-splitDivider {
            display: none;
          }
          .contactMini-splitHalf:first-child {
            padding-right: 0;
            padding-bottom: 14px;
            border-bottom: 1px solid rgba(0, 0, 0, 0.08);
          }
          .contactMini-splitHalf:last-child {
            padding-left: 0;
            padding-top: 14px;
          }
        }
      `}</style>
        </main>
    );
}