import type { Metadata } from "next";
import Link from "next/link";
import styles from "@/components/legal/LegalPage.module.css";

export const metadata: Metadata = {
  title: "Sicurezza dei dati — Evolve",
  description: "Misure tecniche e organizzative adottate per la gestione dei dati nella webapp Evolve.",
};

const sections = [
  { id: "misure", label: "Misure applicate" },
  { id: "fornitori", label: "Fornitori tecnici" },
  { id: "responsabilita", label: "Responsabilità dell’utente" },
  { id: "segnalazioni", label: "Segnalazioni" },
];

export default function SicurezzaPage() {
  return (
    <main className={styles.page}>
      <article className={styles.inner}>
        <header className={styles.hero}>
          <div className={styles.heading}>
            <p className={styles.eyebrow}>MISURE TECNICHE E ORGANIZZATIVE</p>
            <h1>Sicurezza<br />dei dati<span>.</span></h1>
            <p className={styles.introduction}>Evolve adotta misure ragionevoli per proteggere i dati raccolti tramite la webapp. Nessun sistema può garantire sicurezza assoluta; le misure vanno verificate e aggiornate nel tempo.</p>
          </div>
          <aside className={styles.summary} aria-labelledby="security-contact-title">
            <svg className={styles.summaryIcon} width="30" height="30" viewBox="0 0 32 32" fill="none" aria-hidden="true"><path d="m16 3 10 4v8c0 6-4.4 10.4-10 14C10.4 25.4 6 21 6 15V7l10-4Z" stroke="currentColor" strokeWidth="1.25" /><path d="m11 15 3.5 3.5 6.5-7" stroke="currentColor" strokeWidth="1.5" /></svg>
            <h2 id="security-contact-title">Segnalazioni.</h2>
            <p>Per segnalare problemi di sicurezza o richiedere chiarimenti.</p>
            <a href="mailto:infoevolvecompany@gmail.com" className={styles.summaryLink}>Scrivici <span aria-hidden="true">↗</span></a>
          </aside>
        </header>

        <div className={styles.document}>
          <nav className={styles.index} aria-label="Indice della pagina Sicurezza dei dati">
            <p className={styles.indexLabel}>IN QUESTA PAGINA</p>
            <ol>
              {sections.map((section, index) => <li key={section.id}><a href={`#${section.id}`}><span>0{index + 1}</span>{section.label}<span className={styles.indexArrow} aria-hidden="true">↗</span></a></li>)}
            </ol>
          </nav>

          <div className={styles.content}>
            <section id="misure" className={styles.section} aria-labelledby="measures-title">
              <p className={styles.sectionNumber}>01 / MISURE APPLICATE</p>
              <h2 id="measures-title">Misure applicate.</h2>
              <ul className={styles.legalList}>
                <li>Trasmissione tramite HTTPS nell'ambiente di produzione.</li>
                <li>Validazione server-side dei payload tramite schema.</li>
                <li>Honeypot anti-spam nei form pubblici e privati.</li>
                <li>Minimizzazione dei dati richiesti rispetto alla finalità dichiarata.</li>
                <li>Hash dell'indirizzo IP usato come metadato di sicurezza nelle collection MongoDB.</li>
                <li>Accesso ai dati limitato a soggetti autorizzati e fornitori tecnici necessari.</li>
              </ul>
            </section>

            <section id="fornitori" className={styles.section} aria-labelledby="providers-title">
              <p className={styles.sectionNumber}>02 / FORNITORI</p>
              <h2 id="providers-title">Fornitori tecnici.</h2>
              <p>La webapp usa MongoDB per la persistenza delle richieste e Resend per le email transazionali di conferma registrazione. La configurazione effettiva e i relativi accordi devono essere mantenuti aggiornati dal titolare.</p>
            </section>

            <section id="responsabilita" className={styles.section} aria-labelledby="responsibility-title">
              <p className={styles.sectionNumber}>03 / RESPONSABILITÀ</p>
              <h2 id="responsibility-title">Responsabilità dell'utente.</h2>
              <p>Invia solo dati necessari e non inserire informazioni sensibili non richieste nei campi liberi o nei contatti successivi.</p>
            </section>

            <section id="segnalazioni" className={`${styles.section} ${styles.preferences}`} aria-labelledby="reports-title">
              <p className={styles.sectionNumber}>04 / SEGNALAZIONI</p>
              <h2 id="reports-title">Segnalazioni.</h2>
              <p>Per segnalare problemi di sicurezza o richiedere chiarimenti scrivi a <a href="mailto:infoevolvecompany@gmail.com" className={styles.inlineLink}>infoevolvecompany@gmail.com</a>.</p>
              <a href="mailto:infoevolvecompany@gmail.com" className={styles.preferencesButton}>Segnala un problema</a>
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
