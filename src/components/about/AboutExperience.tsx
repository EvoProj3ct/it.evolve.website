import { BrandStatement } from "@/components/BrandStatement";
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

      <BrandStatement
        text={"La tecnologia è il nostro terreno di gioco.\nLe persone, il nostro punto di partenza."}
        variant="inverted"
        label="Le persone e la tecnologia in Evolve"
      />

    </main>
  );
}
