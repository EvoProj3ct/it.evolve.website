"use client";

import Link from "next/link";
import { createConstellation } from "@/components/Constellation";
import type { ConstellationData } from "@/components/Constellation";
import { MenuGhost } from "@/components/MenuGhost";
import ctaStyles from "@/components/agents/AgentServiceExperience.module.css";
import constellationStyles from "@/components/KnowledgeConstellation.module.css";

const consultingPath: ConstellationData = {
  id: "consulting",
  title: "Dalla consulenza alla soluzione giusta.",
  embeddedBackground: true,
  concepts: [
    { name: "Consulenza", text: "Partiamo dal lavoro reale e dagli obiettivi. Prima di scegliere una tecnologia, capiamo insieme quale problema vale la pena risolvere.", desktop: { x: 85, y: 390 } },
    { name: "Esigenze", text: "Ascoltiamo chi svolge il lavoro ogni giorno e mettiamo a fuoco risultati attesi, priorità e vincoli pratici.", desktop: { x: 300, y: 390 } },
    { name: "Rischi", text: "Valutiamo sicurezza, qualità dei dati, tempi, costi e dipendenze. I punti critici entrano nel piano fin dall'inizio.", desktop: { x: 520, y: 190 } },
    { name: "Processi", text: "Mappiamo i passaggi, i colli di bottiglia e le attività ripetitive: spesso è qui che emerge il miglioramento più utile.", desktop: { x: 520, y: 390 } },
    { name: "Ruoli", text: "Individuiamo chi decide, chi usa il sistema e chi lo mantiene. Una soluzione funziona solo se trova posto nell'organizzazione.", desktop: { x: 520, y: 590 } },
    { name: "Piano d'azione", text: "Riuniamo esigenze, rischi, processi e responsabilità in un percorso con priorità e verifiche chiare.", desktop: { x: 800, y: 390 } },
    { name: "Agente IA", text: "Se serve svolgere un compito mirato, progettiamo un agente che lavora con i tuoi strumenti e con confini verificabili.", desktop: { x: 1160, y: 190 } },
    { name: "Software su misura", text: "Quando il lavoro richiede flussi, interfacce o integrazioni specifiche, sviluppiamo un sistema costruito intorno alle persone che lo useranno.", desktop: { x: 1160, y: 390 } },
    { name: "Ottimizzazione", text: "Se gli strumenti esistono già, miglioriamo il processo e li colleghiamo meglio. Proviamo, misuriamo e aggiustiamo insieme.", desktop: { x: 1160, y: 590 } },
  ],
  links: [
    [0, 1],
    [1, 2], [1, 3], [1, 4],
    [3, 5],
    [5, 6], [5, 7], [5, 8],
  ],
  crossLinks: [[2, 5], [4, 5]],
};

export const ConsultingDevelopmentDiagram = createConstellation(consultingPath);

export function ConsultingDevelopmentExperience() {
  return (
    <div className={`${constellationStyles.surface} ${constellationStyles.surfaceToFooter}`}>
      <ConsultingDevelopmentDiagram />
      <section className={ctaStyles.cta} aria-label="Contatti">
        <Link href="/contact" className={ctaStyles.ctaLink}>
          <span className={ctaStyles.ctaLabel}>
            <span className={ctaStyles.ctaGhost} aria-hidden="true"><MenuGhost /></span>
            Parliamone
          </span>
        </Link>
      </section>
    </div>
  );
}
