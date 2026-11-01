"use client";

import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useState, type CSSProperties } from "react";
import { team } from "./team";
import styles from "./AboutExperience.module.css";

const principles = [
  {
    name: "Curiosità",
    title: "Tutto inizia con un “e se?”.",
    description:
      "Ci piace esplorare, fare domande e mettere in discussione le abitudini. Perché una prospettiva diversa può aprire possibilità che prima non vedevamo.",
    word: "Esplorare",
  },
  {
    name: "Metodo",
    title: "Alle intuizioni diamo forma.",
    description:
      "Un’idea prende valore quando incontra la realtà. Osserviamo, progettiamo e sperimentiamo, un passo alla volta. Ogni tentativo è un’occasione per fare meglio.",
    word: "Costruire",
  },
  {
    name: "Condivisione",
    title: "Le idee crescono tra le persone.",
    description:
      "La conoscenza si moltiplica quando circola. Ci piace rendere la tecnologia comprensibile, confrontarci e costruire connessioni che fanno nascere nuove idee.",
    word: "Connettere",
  },
] as const;

function Arrow({ diagonal = false }: { diagonal?: boolean }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      {diagonal ? (
        <path d="M5 19 19 5M5 5h14v14" stroke="currentColor" strokeWidth="1.5" />
      ) : (
        <path d="M4 12h15m-6-6 6 6-6 6" stroke="currentColor" strokeWidth="1.5" />
      )}
    </svg>
  );
}

function Spark({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 100 100" fill="none" aria-hidden="true">
      <path d="M50 0v100M0 50h100M14.65 14.65l70.7 70.7m0-70.7-70.7 70.7" stroke="currentColor" strokeWidth="9" />
    </svg>
  );
}

export function AboutExperience() {
  const reduceMotion = useReducedMotion();
  const [aligned, setAligned] = useState(false);
  const [activePrinciple, setActivePrinciple] = useState(0);
  const principle = principles[activePrinciple];
  const ease = [0.22, 1, 0.36, 1] as const;

  return (
    <main className={styles.page}>
      <section className={styles.hero} aria-labelledby="about-title">
        <div className={styles.heroHeading}>
          <p className={styles.eyebrow}><span className={styles.statusDot} /> IL LATO UMANO DI EVOLVE</p>
          <h1 id="about-title">Il futuro ha<br />un lato <span className={styles.human}>umano<span className={styles.period}>.</span></span></h1>
          <p className={styles.heroIntro}>Tre persone. Prospettive diverse. La stessa voglia di evolvere.</p>
        </div>

        <div className={`${styles.orbitStage} ${aligned ? styles.aligned : ""}`}>
          <div className={styles.orbitArtwork} aria-hidden="true">
            <svg viewBox="0 0 1200 430" fill="none" preserveAspectRatio="xMidYMid meet">
              <ellipse cx="600" cy="224" rx="462" ry="128" transform="rotate(-9 600 224)" className={styles.orbitLine} />
              <ellipse cx="600" cy="224" rx="365" ry="164" transform="rotate(12 600 224)" className={styles.orbitDashed} />
              <path d="M52 224h36m-18-18v36m1040-91h24m-12-12v24" className={styles.orbitCross} />
              <circle cx="184" cy="308" r="5" fill="currentColor" />
              <circle cx="1010" cy="163" r="5" fill="currentColor" />
            </svg>
            <span className={styles.coordinateLeft}>41°50′ N<br />12°53′ E</span>
            <span className={styles.coordinateRight}>IDEE IN<br />MOVIMENTO</span>
            <span className={styles.orbitNote}>Il nostro punto d’incontro.</span>
            <Spark className={styles.heroSpark} />
          </div>

          <div className={styles.portraitOrbit}>
            {team.map((person, index) => (
              <motion.div
                key={person.id}
                className={styles.orbitCardPosition}
                animate={{ rotate: aligned ? 0 : [-10, 5, 11][index], y: aligned ? 0 : [8, 48, -8][index] }}
                transition={{ duration: reduceMotion ? 0 : 0.8, ease }}
              >
                <a
                  href={`#${person.id}`}
                  className={styles.orbitCard}
                  style={{ "--float-delay": `${index * -2.3}s` } as CSSProperties}
                  aria-label={`Conosci ${person.name} ${person.surname}`}
                >
                  <div className={styles.orbitPhoto}>
                    <Image
                      src={person.image}
                      alt={`${person.name} ${person.surname}`}
                      fill
                      sizes="(max-width: 600px) 31vw, (max-width: 1000px) 25vw, 240px"
                      style={{ objectPosition: person.position }}
                      priority
                    />
                    <span className={styles.photoIndex}>0{index + 1}</span>
                  </div>
                  <div className={styles.orbitCaption}><span>{person.name}<br /><strong>{person.surname}</strong></span><Arrow diagonal /></div>
                </a>
              </motion.div>
            ))}
          </div>
        </div>

        <div className={styles.heroBottom}>
          <a href="#persone" className={styles.discoverLink}>Conosci il team <span>↓</span></a>
          <button type="button" className={styles.orbitToggle} onClick={() => setAligned(!aligned)} aria-pressed={aligned}>
            <span className={styles.toggleIcon} aria-hidden="true"><i /><i /><i /></span>
            {aligned ? "Libera le idee" : "Allinea il team"}
          </button>
          <span className={styles.heroFootnote}>PERSONE, PRIMA DI TUTTO.</span>
        </div>
      </section>

      <section className={styles.connection} aria-labelledby="connection-title">
        <div className={styles.sectionLabel}><span>01 / CONNESSIONI</span><span>È QUI CHE SUCCEDE.</span></div>
        <motion.h2
          id="connection-title"
          initial={false}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
        >
          La tecnologia è il nostro<br className={styles.desktopBreak} /> terreno di gioco.<br />
          <span>Le persone, il nostro<br className={styles.desktopBreak} /> punto di partenza.</span>
        </motion.h2>
        <div className={styles.connectionFooter}><Spark /><p>Siamo Evolve. Ci incontriamo dove la curiosità diventa un’idea.<br className={styles.desktopBreak} /> E un’idea comincia a prendere forma.</p></div>
      </section>

      <section id="persone" className={styles.teamSection} aria-labelledby="team-title">
        <div className={styles.teamHeading}>
          <div><p className={styles.eyebrow}>02 / LE PERSONE</p><h2 id="team-title">Piacere, <span>noi.</span></h2></div>
          <p>Dietro le idee, i progetti e le mille domande,<br className={styles.desktopBreak} /> ci sono loro. Anzi, ci siamo noi.</p>
        </div>

        <div className={styles.teamGrid}>
          {team.map((person, index) => (
            <article key={person.id} id={person.id} className={styles.person}>
              <a className={styles.personPhotoLink} href={`#bio-${person.id}`} aria-label={`Leggi la descrizione di ${person.name} ${person.surname}`}>
                <div className={styles.personPhoto}>
                  <Image src={person.image} alt={`Ritratto di ${person.name} ${person.surname}`} fill sizes="(max-width: 700px) 90vw, 30vw" style={{ objectPosition: person.position }} />
                  <span className={styles.personNumber}>EVOLVE / 0{index + 1}</span>
                  <span className={styles.portraitArrow}><Arrow diagonal /></span>
                </div>
              </a>
              <div className={styles.personName}><h3>{person.name}<br />{person.surname}</h3><span className={styles.memberDot} aria-hidden="true" /></div>
              <div id={`bio-${person.id}`} className={styles.biography}>
                <p className={styles.bioLabel}>DESCRIZIONE IN ARRIVO</p>
                <p>{person.biography}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.manifesto} aria-labelledby="manifesto-title">
        <div className={styles.sectionLabel}><span>03 / IL NOSTRO MODO DI ESSERE</span><span>SEMPRE IN EVOLUZIONE ↗</span></div>
        <div className={styles.manifestoHeading}><h2 id="manifesto-title">Un’attitudine.<br /><span>Infinite possibilità.</span></h2><p>Cambiano gli strumenti, cambiano le sfide.<br />Quello che ci muove resta.</p></div>
        <div className={styles.principleGrid}>
          <div className={styles.principleVisual} data-principle={activePrinciple} aria-hidden="true">
            <div className={styles.visualRing} /><div className={styles.visualRingInner} />
            <motion.div className={styles.visualSpark} animate={{ rotate: activePrinciple * 90 }} transition={{ duration: reduceMotion ? 0 : 1.2, ease }}><Spark /></motion.div>
            <span className={styles.visualNorth}>PENSIERO</span><span className={styles.visualSouth}>AZIONE</span>
            <span className={styles.visualWord} key={principle.word}>{principle.word}<span>↗</span></span>
            <span className={styles.visualIndex}>0{activePrinciple + 1} — 03</span>
          </div>
          <div className={styles.principleContent}>
            <div className={styles.principleChoices} role="group" aria-label="Esplora i valori di Evolve">
              {principles.map((item, index) => (
                <button key={item.name} type="button" className={styles.principleChoice} aria-pressed={activePrinciple === index} aria-controls="principle-description" onClick={() => setActivePrinciple(index)}>
                  <span className={styles.choiceNumber}>0{index + 1}</span><span>{item.name}</span><span className={styles.choiceArrow}>↗</span>
                </button>
              ))}
            </div>
            <div id="principle-description" className={styles.principleDescription} aria-live="polite" aria-atomic="true">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div key={principle.name} initial={{ opacity: reduceMotion ? 1 : 0, y: reduceMotion ? 0 : 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: reduceMotion ? 1 : 0, y: reduceMotion ? 0 : -8 }} transition={{ duration: reduceMotion ? 0 : 0.22 }}>
                  <h3>{principle.title}</h3><p>{principle.description}</p>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.invitation} aria-labelledby="invitation-title">
        <p className={styles.eyebrow}><span className={styles.statusDot} /> LA PROSSIMA CONNESSIONE</p>
        <div className={styles.invitationBody}><h2 id="invitation-title">E se la prossima idea<br />iniziasse da <span>un ciao?</span></h2><Link href="/contact" className={styles.contactCircle} aria-label="Parliamone, vai ai contatti"><Arrow diagonal /></Link></div>
        <div className={styles.invitationFooter}><span>Le cose interessanti iniziano parlando.</span><Link href="/contact">Facciamolo <Arrow /></Link></div>
      </section>
    </main>
  );
}
