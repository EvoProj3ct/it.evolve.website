import type { Metadata } from "next";
import { QGhostLab } from "@/components/experiments/QGhostLab";

export const metadata: Metadata = {
  title: "Il fantasmino si fa furbo — Laboratorio Evolve",
  description: "Un piccolo Pac-Man per scoprire il Q-learning: giochi, il fantasmino impara a inseguirti e le statistiche raccontano la sua esperienza.",
};

export default function Page() {
  return <QGhostLab />;
}
