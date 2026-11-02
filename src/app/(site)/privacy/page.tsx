import type { Metadata } from "next";
import Link from "next/link";
import styles from "@/components/legal/LegalPage.module.css";

export const metadata: Metadata = {
  title: "Privacy Policy — Evolve",
  description: "Informativa generale sul trattamento dei dati personali nella webapp Evolve.",
};

const sections = [
  { id: "titolare", label: "Titolare del trattamento" },
  { id: "dati-form", label: "Dati raccolti dai form" },
  { id: "navigazione", label: "Dati di navigazione" },
  { id: "finalita", label: "Finalità e basi giuridiche" },
  { id: "conservazione", label: "Conservazione e destinatari" },
  { id: "diritti", label: "I tuoi diritti" },
  { id: "cookie", label: "Cookie" },
];

export default function PrivacyPage() {
  return (
    <main className={styles.page}>
      <article className={styles.inner}>
        <header className={styles.hero}>
          <div className={styles.heading}>
            <p className={styles.eyebrow}>INFORMATIVA GENERALE</p>
            <h1>Privacy Policy<span>.</span></h1>
            <p className={styles.introduction}>Questa informativa descrive in modo generale come la webapp Evolve tratta i dati raccolti tramite navigazione e form.</p>
            <p className={styles.updated}>Ultimo aggiornamento <time dateTime="2026-06-18">18 giugno 2026</time></p>
          </div>
          <aside className={styles.summary} aria-labelledby="privacy-contact-title">
            <svg className={styles.summaryIcon} width="30" height="30" viewBox="0 0 32 32" fill="none" aria-hidden="true"><rect x="4" y="7" width="24" height="18" rx="3" stroke="currentColor" strokeWidth="1.25" /><path d="m5 9 11 9L27 9" stroke="currentColor" strokeWidth="1.25" strokeLinejoin="round" /></svg>
            <h2 id="privacy-contact-title">Richieste<br />privacy.</h2>
            <p>Per richieste privacy preliminari:</p>
            <a href="mailto:infoevolvecompany@gmail.com" className={styles.summaryLink}>Scrivici <span aria-hidden="true">↗</span></a>
          </aside>
        </header>

        <div className={styles.document}>
          <nav className={styles.index} aria-label="Indice della Privacy Policy">
            <p className={styles.indexLabel}>IN QUESTA PAGINA</p>
            <ol>
              {sections.map((section, index) => <li key={section.id}><a href={`#${section.id}`}><span>0{index + 1}</span>{section.label}<span className={styles.indexArrow} aria-hidden="true">↗</span></a></li>)}
            </ol>
          </nav>

          <div className={styles.content}>
            <section id="titolare" className={styles.section} aria-labelledby="controller-title">
              <p className={styles.sectionNumber}>01 / TITOLARE</p>
              <h2 id="controller-title">Titolare del trattamento.</h2>
              <p>Evolve Srls, Via Ciciliano, 59/b, 00036 Palestrina (RM), P.IVA 18138881000. Per richieste privacy preliminari: <a className={styles.inlineLink} href="mailto:infoevolvecompany@gmail.com">infoevolvecompany@gmail.com</a>. I riferimenti definitivi devono essere validati dal titolare o da un consulente privacy.</p>
            </section>

            <section id="dati-form" className={styles.section} aria-labelledby="form-data-title">
              <p className={styles.sectionNumber}>02 / DATI RACCOLTI</p>
              <h2 id="form-data-title">Dati raccolti tramite form.</h2>
              <p>I form possono raccogliere nome, cognome, email, telefono facoltativo, profilo professionale, preferenze informative, uso dichiarato dell'IA, consensi, dati relativi a registrazioni evento e metadati tecnici minimi necessari alla sicurezza.</p>
            </section>

            <section id="navigazione" className={styles.section} aria-labelledby="browsing-data-title">
              <p className={styles.sectionNumber}>03 / NAVIGAZIONE</p>
              <h2 id="browsing-data-title">Dati di navigazione.</h2>
              <p>Durante la navigazione possono essere trattati dati tecnici necessari al funzionamento del sito, come indirizzo IP nei log infrastrutturali, user agent, data e ora delle richieste e cookie tecnici.</p>
            </section>

            <section id="finalita" className={styles.section} aria-labelledby="purposes-title">
              <p className={styles.sectionNumber}>04 / FINALITÀ</p>
              <h2 id="purposes-title">Finalità e basi giuridiche.</h2>
              <ul className={styles.legalList}>
                <li>Gestione di richieste, iscrizioni e comunicazioni organizzative: esecuzione di misure precontrattuali o interesse legittimo organizzativo.</li>
                <li>Invio di materiali, eventi formativi e informazioni su prodotti o servizi: consenso facoltativo ove richiesto.</li>
                <li>Sicurezza, prevenzione abusi e integrità dei sistemi: interesse legittimo e obblighi tecnici.</li>
              </ul>
            </section>

            <section id="conservazione" className={styles.section} aria-labelledby="retention-title">
              <p className={styles.sectionNumber}>05 / CONSERVAZIONE</p>
              <h2 id="retention-title">Conservazione, destinatari e trasferimenti.</h2>
              <p>I dati sono conservati per il tempo necessario alle finalità indicate e riesaminati periodicamente. Possono essere trattati da fornitori tecnici come hosting, database MongoDB e provider email Resend. Eventuali trasferimenti extra UE dipendono dai fornitori adottati e devono essere verificati tramite accordi e garanzie applicabili.</p>
            </section>

            <section id="diritti" className={styles.section} aria-labelledby="rights-title">
              <p className={styles.sectionNumber}>06 / I TUOI DIRITTI</p>
              <h2 id="rights-title">Diritti dell'interessato.</h2>
              <p>Puoi richiedere accesso, rettifica, cancellazione, limitazione, opposizione e portabilità nei casi previsti. Puoi inoltre revocare i consensi facoltativi senza pregiudicare la liceità del trattamento precedente.</p>
            </section>

            <section id="cookie" className={`${styles.section} ${styles.preferences}`} aria-labelledby="privacy-cookie-title">
              <p className={styles.sectionNumber}>07 / COOKIE</p>
              <h2 id="privacy-cookie-title">Cookie.</h2>
              <p>La gestione dei cookie è descritta nella <Link href="/cookie-policy" className={styles.inlineLink}>Cookie Policy</Link>.</p>
              <Link href="/cookie-policy" className={styles.preferencesButton}>Leggi la Cookie Policy</Link>
            </section>
          </div>
        </div>
      </article>
    </main>
  );
}
