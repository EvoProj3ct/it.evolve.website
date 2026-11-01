import { OrbitTeam } from "./OrbitTeam";
import styles from "./AboutExperience.module.css";

export function AboutExperience() {
  return (
    <main className={styles.page}>
      <section className={styles.hero} aria-labelledby="about-title">
        <div className={styles.heroHeading}>
          <h1 id="about-title"><span className={styles.titleLine}>Il futuro che sognamo</span>{" "}<span className={styles.titleLine}>ha un lato <span className={styles.human}>umano<span className={styles.period}>.</span></span></span></h1>
        </div>

        <OrbitTeam />
      </section>

      <section className={styles.connection} aria-labelledby="connection-title">
        <h2 id="connection-title">
          La tecnologia è il nostro<br className={styles.desktopBreak} /> terreno di gioco.<br />
          <span>Le persone, il nostro<br className={styles.desktopBreak} /> punto di partenza.</span>
        </h2>
      </section>

    </main>
  );
}
