"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { CookiePreferencesButton } from "@/components/legal/cookie-preferences-button";

// ✅ nuovo path (cartella waveBattery)
import FooterMiniGame from "@/components/waveBattery/FooterMiniGame";

function pickAccent() {
    const accents = ["var(--accent-blue)", "var(--accent-purple)", "var(--accent-yellow)"];
    return accents[Math.floor(Math.random() * accents.length)];
}

export function SiteFooter() {
    const rootRef = useRef<HTMLElement | null>(null);

    useEffect(() => {
        const root = rootRef.current;
        if (!root) return;

        const links = Array.from(root.querySelectorAll<HTMLAnchorElement>(".footer-link"));

        const handlers = links.map((a) => {
            const onEnter = () => a.style.setProperty("--hover-accent", pickAccent());
            a.addEventListener("mouseenter", onEnter);
            return { a, onEnter };
        });

        return () => {
            handlers.forEach(({ a, onEnter }) => a.removeEventListener("mouseenter", onEnter));
        };
    }, []);

    return (
        <footer ref={rootRef as any} className="footer-section" aria-label="Footer">
            <div className="footer-wrap">
                <div className="footer-grid">
                    {/* COL 1 */}
                    <div className="footer-col">
                        <h3 className="footer-title">Contattaci</h3>

                        <div className="footer-item">
                            <span className="footer-itemLabel">Sede Legale</span>
                            <p className="footer-itemText">Via Ciciliano, 59/b 00036 Palestrina (RM)</p>
                        </div>

                        <div className="footer-item">
                            <span className="footer-itemLabel">Scrivici</span>
                            <a className="footer-link" href="mailto:infoevolvecompany@gmail.com">
                                infoevolvecompany@gmail.com
                            </a>
                        </div>

                        <div className="footer-item">
                            <span className="footer-itemLabel">P.IVA</span>
                            <a className="footer-link" href="">
                                P.IVA: 18138881000
                            </a>
                        </div>
                    </div>

                    {/* COL 2 */}
                    <div className="footer-col">
                        <h3 className="footer-title">Sfidaci!</h3>

                        {/* Mini gioco 8-bit */}
                        <FooterMiniGame />
                    </div>

                    {/* COL 3 */}
                    <div className="footer-col footer-brand">
                        <div className="footer-logo"></div>

                        <div className="footer-socials" aria-label="Social">
                            <Link className="footer-socialBtn" href="#" aria-label="Facebook">f</Link>
                            <Link className="footer-socialBtn" href="#" aria-label="X">𝕏</Link>
                            <Link className="footer-socialBtn" href="#" aria-label="Instagram">⌁</Link>
                            <Link className="footer-socialBtn" href="#" aria-label="YouTube">A</Link>
                        </div>

                        <div className="footer-copy">
                            © {new Date().getFullYear()}, <span className="footer-copyBrand">Evolve</span>. Think Deeper{" "}
                            <span className="footer-copyAccent">Think to Evolve</span>.
                        </div>
                        <div className="mt-4 flex flex-wrap justify-center gap-3 text-xs">
                            <Link className="footer-link" href="/privacy">Privacy</Link>
                            <Link className="footer-link" href="/cookie-policy">Cookie Policy</Link>
                            <Link className="footer-link" href="/sicurezza">Sicurezza</Link>
                            <CookiePreferencesButton className="footer-link" />
                        </div>
                    </div>
                </div>
            </div>
        </footer>
    );
}
