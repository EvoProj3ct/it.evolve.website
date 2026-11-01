import type { Metadata } from "next";
import { AboutExperience } from "@/components/about/AboutExperience";

export const metadata: Metadata = {
  title: "Chi siamo — Evolve",
  description:
    "Il lato umano di Evolve. Incontra Luca Marinelli, Emanuele Ienna e Luca De Angelis: persone, idee e nuove prospettive.",
};

export default function Page() {
  return <AboutExperience />;
}
