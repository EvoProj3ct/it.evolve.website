"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { SupportChat } from "@/components/SupportChat";
import { MenuGhost } from "@/components/MenuGhost";
import styles from "./Navbar.module.css";

type MenuKey = "services" | "events" | "utils";
const NAV_ITEMS = ["services", "events", "about", "utils"] as const;
type Menu = {
  label: string;
  heading: string;
  overviewLabel: string;
  overviewHref: string;
  items: { label: string; href: string }[];
};

const MENUS: Record<MenuKey, Menu> = {
  services: {
    label: "Servizi",
    heading: "Rivolgiti a chi ha lavorato nel settore IA fin dalla sua nascita.",
    overviewLabel: "portfolio",
    overviewHref: "/portfolio",
    items: [
      { label: "Software per il mondo finestra", href: "/portfolio" },
      { label: "Sviluppo sartoriale", href: "/portfolio" },
      { label: "Consulenza sartoriale", href: "/about" },
      { label: "Progettazione Agenti IA", href: "/portfolio" },
      { label: "Bandi", href: "/contact" },
    ],
  },
  events: {
    label: "Eventi",
    heading: "La tecnologia è un bene da condividere.",
    overviewLabel: "Rimani aggiornato",
    overviewHref: "/rimani-aggiornato",
    items: [
      { label: "Seminari", href: "/rimani-aggiornato" },
      { label: "Chiedilo all'IA", href: "/chiedilo-all-ia" },
      { label: "Festival IA di Palestrina", href: "/rimani-aggiornato" },
    ],
  },
  utils: {
    label: "Utils",
    heading: "Risorse da tenere a portata di mano.",
    overviewLabel: "Tutte le risorse",
    overviewHref: "/utils",
    items: [
      { label: "Brochure", href: "/utils#brochure" },
      { label: "Corsi", href: "/utils#corsi" },
      { label: "PDF utili", href: "/utils#pdf-utili" },
    ],
  },
};

function Chevron({ open }: { open: boolean }) {
  return (
    <svg className={`${styles.chevron} ${open ? styles.chevronOpen : ""}`} aria-hidden="true" width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="m3.25 5.25 3.75 3.5 3.75-3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ChatIcon() {
  return (
    <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M7 18 4 21V6a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3v9a3 3 0 0 1-3 3H7Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <path d="M8 8h8m-8 4h6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

export function Navbar() {
  const pathname = usePathname();
  const reduceMotion = useReducedMotion();
  const headerRef = useRef<HTMLElement>(null);
  const menuPinnedRef = useRef(false);
  const restoreFocusRef = useRef<HTMLButtonElement | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [activeMenu, setActiveMenu] = useState<MenuKey | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileSection, setMobileSection] = useState<MenuKey | null>(null);
  const [chatOpen, setChatOpen] = useState(false);

  useEffect(() => {
    let lastScrollY = window.scrollY;
    const onScroll = () => {
      const scrollY = window.scrollY;
      const distance = scrollY - lastScrollY;
      setScrolled(scrollY > 24);

      if (scrollY <= 24) setHidden(false);
      if (Math.abs(distance) < 6) return;

      setHidden(scrollY > 100 && distance > 0);
      menuPinnedRef.current = false;
      setActiveMenu(null);
      lastScrollY = scrollY;
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        const openTrigger = headerRef.current?.querySelector<HTMLButtonElement>('[aria-controls^="nav-panel-"][aria-expanded="true"]');
        if (openTrigger) {
          event.preventDefault();
          restoreFocusRef.current = openTrigger;
        }
        menuPinnedRef.current = false;
        setActiveMenu(null);
        setMobileOpen(false);
      }
    };
    const onPointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node && !headerRef.current?.contains(event.target)) {
        menuPinnedRef.current = false;
        setActiveMenu(null);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("pointerdown", onPointerDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("pointerdown", onPointerDown);
    };
  }, []);

  useEffect(() => {
    if (!mobileOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, [mobileOpen]);

  const closeNavigation = () => {
    menuPinnedRef.current = false;
    setActiveMenu(null);
    setMobileOpen(false);
    setMobileSection(null);
  };
  const openChat = () => {
    closeNavigation();
    setChatOpen(true);
  };
  const menuTransition = { duration: reduceMotion ? 0 : 0.34, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] };

  return (
    <>
      <header
        ref={headerRef}
        className={`${styles.header} ${scrolled ? styles.headerScrolled : ""} ${hidden ? styles.headerHidden : ""} ${activeMenu || mobileOpen ? styles.headerMenuOpen : ""} ${pathname === "/" && !scrolled && !activeMenu && !mobileOpen ? styles.headerOverHero : ""}`}
        data-evolve-nav=""
        data-menu-open={Boolean(activeMenu || mobileOpen)}
        onMouseLeave={() => { if (!menuPinnedRef.current) setActiveMenu(null); }}
      >
        <div className={styles.bar}>
          <Link href="/" className={styles.logoLink} onClick={closeNavigation} aria-label="Evolve, homepage">
            <Image src="/logoEvolve.png" alt="Evolve" width={64} height={51} className={styles.logo} priority />
          </Link>

          <nav className={styles.desktopNav} aria-label="Navigazione principale">
            <Link href="/" className={`${styles.navLink} ${pathname === "/" && !activeMenu ? styles.currentLink : ""}`} onMouseEnter={() => { menuPinnedRef.current = false; setActiveMenu(null); }} onClick={closeNavigation}>Home</Link>
            {NAV_ITEMS.map((key) => key === "about" ? (
              <Link key={key} href="/about" className={`${styles.navLink} ${pathname === "/about" && !activeMenu ? styles.currentLink : ""}`} onMouseEnter={() => { menuPinnedRef.current = false; setActiveMenu(null); }} onClick={closeNavigation}>Chi siamo</Link>
            ) : (
              <button
                key={key}
                type="button"
                className={`${styles.navLink} ${styles.navTrigger} ${activeMenu === key ? styles.activeTrigger : ""}`}
                aria-expanded={activeMenu === key}
                aria-controls={`nav-panel-${key}`}
                onMouseEnter={() => { menuPinnedRef.current = false; setActiveMenu(key); }}
                onKeyDown={(event) => {
                  if (event.key !== "ArrowDown") return;
                  event.preventDefault();
                  menuPinnedRef.current = true;
                  setActiveMenu(key);
                  window.requestAnimationFrame(() => {
                    document.getElementById(`nav-panel-${key}`)?.querySelector<HTMLAnchorElement>("a")?.focus();
                  });
                }}
                onClick={() => {
                  if (menuPinnedRef.current && activeMenu === key) {
                    menuPinnedRef.current = false;
                    setActiveMenu(null);
                  } else {
                    menuPinnedRef.current = true;
                    setActiveMenu(key);
                  }
                }}
              >
                {MENUS[key].label}<Chevron open={activeMenu === key} />
              </button>
            ))}
            <Link href="/contact" className={`${styles.navLink} ${pathname === "/contact" && !activeMenu ? styles.currentLink : ""}`} onMouseEnter={() => { menuPinnedRef.current = false; setActiveMenu(null); }} onClick={closeNavigation}>Contatti</Link>
          </nav>

          <div className={styles.actions}>
            <button type="button" className={styles.chatButton} onClick={openChat} aria-label="Chiedilo a Leo">
              <ChatIcon /><span>Chiedilo a Leo</span>
            </button>
            <button
              type="button"
              className={`${styles.mobileToggle} ${mobileOpen ? styles.mobileToggleOpen : ""}`}
              onClick={() => { setActiveMenu(null); setMobileOpen(!mobileOpen); }}
              aria-label={mobileOpen ? "Chiudi menu" : "Apri menu"}
              aria-expanded={mobileOpen}
              aria-controls="mobile-site-nav"
            >
              <span /><span />
            </button>
          </div>
        </div>

        <AnimatePresence onExitComplete={() => {
          restoreFocusRef.current?.focus();
          restoreFocusRef.current = null;
        }}>
          {activeMenu && (
            <motion.div
              key={activeMenu}
              id={`nav-panel-${activeMenu}`}
              className={styles.megaPanel}
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={menuTransition}
            >
              <div className={styles.megaInner}>
                <div className={styles.megaIntro}>
                  <h2>{MENUS[activeMenu].heading}</h2>
                  <Link href={MENUS[activeMenu].overviewHref} className={styles.overviewLink} onClick={closeNavigation}>
                    {MENUS[activeMenu].overviewLabel}
                  </Link>
                </div>
                <div className={styles.megaItems}>
                  {MENUS[activeMenu].items.map((item, index) => (
                    <motion.div
                      key={item.label}
                      initial={{ opacity: 0, y: 7 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4, transition: { duration: reduceMotion ? 0 : 0.18, delay: 0 } }}
                      transition={{ duration: reduceMotion ? 0 : 0.38, delay: reduceMotion ? 0 : 0.08 + index * 0.075, ease: [0.22, 1, 0.36, 1] }}
                    >
                      <Link href={item.href} className={styles.megaItem} onClick={closeNavigation}>
                        <span>{item.label}</span><MenuGhost />
                      </Link>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      <AnimatePresence>
        {mobileOpen && (
          <motion.nav
            id="mobile-site-nav"
            className={styles.mobilePanel}
            aria-label="Navigazione mobile"
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={menuTransition}
          >
            <div className={styles.mobileInner}>
              <Link href="/" className={styles.mobileLink} onClick={closeNavigation}>Home</Link>
              {NAV_ITEMS.map((key) => key === "about" ? (
                <Link key={key} href="/about" className={styles.mobileLink} onClick={closeNavigation}>Chi siamo</Link>
              ) : (
                <div className={styles.mobileGroup} key={key}>
                  <button
                    type="button"
                    className={styles.mobileSectionButton}
                    aria-expanded={mobileSection === key}
                    aria-controls={`mobile-${key}`}
                    onClick={() => setMobileSection(mobileSection === key ? null : key)}
                  >
                    {MENUS[key].label}<Chevron open={mobileSection === key} />
                  </button>
                  <AnimatePresence initial={false}>
                    {mobileSection === key && (
                      <motion.div
                        id={`mobile-${key}`}
                        className={styles.mobileSubmenu}
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={menuTransition}
                      >
                        <p className={styles.mobileStatement}>{MENUS[key].heading}</p>
                        {MENUS[key].items.map((item, index) => (
                          <motion.div
                            key={item.label}
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: reduceMotion ? 0 : 0.32, delay: reduceMotion ? 0 : 0.06 + index * 0.06 }}
                          >
                            <Link href={item.href} className={styles.mobileSubLink} onClick={closeNavigation}>
                              {item.label}
                            </Link>
                          </motion.div>
                        ))}
                        <Link href={MENUS[key].overviewHref} className={styles.mobileOverview} onClick={closeNavigation}>{MENUS[key].overviewLabel}</Link>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
              <Link href="/contact" className={styles.mobileLink} onClick={closeNavigation}>Contatti</Link>
            </div>
          </motion.nav>
        )}
      </AnimatePresence>

      <SupportChat open={chatOpen} onClose={() => setChatOpen(false)} />
    </>
  );
}
