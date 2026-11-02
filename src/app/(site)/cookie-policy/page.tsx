import type { Metadata } from "next";
import Link from "next/link";
import { CookiePreferencesButton } from "@/components/legal/cookie-preferences-button";
import { COOKIE_CATEGORIES, COOKIE_CONSENT_NAME } from "@/lib/legal/cookie-consent";
import styles from "@/components/legal/LegalPage.module.css";

export const metadata: Metadata = {
  title: "Cookie Policy — Evolve",
  description: "Informazioni sui cookie tecnici e sulle categorie predisposte ma non utilizzate nella webapp Evolve.",
};

const sections = [
  { id: "cookie-tecnici", label: "Cookie tecnici" },
  { id: "categorie", label: "Categorie e stato" },
  { id: "preferenze", label: "Le tue preferenze" },
  { id: "aggiornamenti", label: "Aggiornamenti" },
];

export default function CookiePolicyPage() {
  return (
    <main className={styles.page}>
      <article className={styles.inner}>
        <header className={styles.hero}>
          <div className={styles.heading}>
            <p className={styles.eyebrow}>COOKIE E TECNOLOGIE SIMILI</p>
            <h1>Cookie Policy<span>.</span></h1>
            <p className={styles.introduction}>Qui trovi le informazioni sui cookie utilizzati da Evolve e su come gestire le tue preferenze.</p>
            <p className={styles.updated}>Ultimo aggiornamento <time dateTime="2026-06-18">18 giugno 2026</time></p>
          </div>
          <aside className={styles.summary} aria-labelledby="cookie-summary-title">
            <svg className={styles.summaryIcon} width="30" height="30" viewBox="0 0 32 32" fill="none" aria-hidden="true"><path d="m16 3 10 4v8c0 6-4.4 10.4-10 14C10.4 25.4 6 21 6 15V7l10-4Z" stroke="currentColor" strokeWidth="1.25" /><path d="m11 15 3.5 3.5 6.5-7" stroke="currentColor" strokeWidth="1.5" /></svg>
            <h2 id="cookie-summary-title">Solo i cookie<br />necessari.</h2>
            <p>Al momento non utilizziamo cookie per statistiche, marketing o profilazione, né strumenti equivalenti di tracciamento.</p>
          </aside>
        </header>

        <div className={styles.document}>
          <nav className={styles.index} aria-label="Indice della Cookie Policy">
            <p className={styles.indexLabel}>IN QUESTA PAGINA</p>
            <ol>
              {sections.map((section, index) => <li key={section.id}><a href={`#${section.id}`}><span>0{index + 1}</span>{section.label}<span className={styles.indexArrow} aria-hidden="true">↗</span></a></li>)}
            </ol>
          </nav>

          <div className={styles.content}>
            <section id="cookie-tecnici" className={styles.section} aria-labelledby="technical-title">
              <p className={styles.sectionNumber}>01 / FUNZIONAMENTO</p>
              <h2 id="technical-title">I cookie tecnici.</h2>
              <p>Il sito utilizza cookie tecnici necessari al proprio funzionamento. Il cookie <code>{COOKIE_CONSENT_NAME}</code> conserva la tua scelta sulle preferenze cookie in modo versionato, per circa 6 mesi.</p>
              <dl className={styles.cookieRecord}>
                <div><dt>Nome</dt><dd><code>{COOKIE_CONSENT_NAME}</code></dd></div>
                <div><dt>Tipologia</dt><dd>Tecnico, necessario</dd></div>
                <div><dt>Finalità</dt><dd>Ricordare la tua scelta sui cookie</dd></div>
                <div><dt>Durata</dt><dd>Circa 6 mesi</dd></div>
              </dl>
            </section>

            <section id="categorie" className={styles.section} aria-labelledby="categories-title">
              <p className={styles.sectionNumber}>02 / TRASPARENZA</p>
              <h2 id="categories-title">Categorie e stato.</h2>
              <p>Le categorie facoltative sono predisposte ma non utilizzate. Di seguito trovi lo stato di ogni categoria.</p>
              <ul className={styles.categoryList}>
                {COOKIE_CATEGORIES.map(category => (
                  <li key={category.id}>
                    <div><h3>{category.label}</h3><p>{category.description}</p></div>
                    <span className={`${styles.categoryStatus} ${category.active ? styles.activeStatus : ""}`}>{category.active && <span aria-hidden="true" />}{category.status}</span>
                  </li>
                ))}
              </ul>
            </section>

            <section id="preferenze" className={`${styles.section} ${styles.preferences}`} aria-labelledby="preferences-title">
              <p className={styles.sectionNumber}>03 / LE TUE SCELTE</p>
              <h2 id="preferences-title">Le preferenze,<br />quando vuoi.</h2>
              <p>Puoi riaprire il pannello delle preferenze con il pulsante qui sotto o dal collegamento “Preferenze cookie” nel footer del sito.</p>
              <CookiePreferencesButton className={styles.preferencesButton} />
            </section>

            <section id="aggiornamenti" className={styles.section} aria-labelledby="updates-title">
              <p className={styles.sectionNumber}>04 / AGGIORNAMENTI</p>
              <h2 id="updates-title">Se qualcosa cambia.</h2>
              <p>Se in futuro venissero introdotte categorie non tecniche, analytics o marketing, la Cookie Policy e il pannello preferenze dovranno essere aggiornati prima dell’attivazione.</p>
            </section>

            <div className={styles.related}>
              <span>Per le informazioni sul trattamento dei dati personali</span>
              <Link href="/privacy">Privacy Policy <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 19 19 5M5 5h14v14" stroke="currentColor" strokeWidth="1.4" /></svg></Link>
            </div>
          </div>
        </div>
      </article>
    </main>
  );
}
