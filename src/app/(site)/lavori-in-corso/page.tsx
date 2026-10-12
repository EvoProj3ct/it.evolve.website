import type { Metadata } from "next";
import { GhostMazeHero } from "@/components/GhostMazeHero";

export const metadata: Metadata = {
  title: "Lavori in corso | Evolve",
  description: "Stiamo preparando questa sezione di Evolve.",
};

export default function WorkInProgressPage() {
  return <main><GhostMazeHero variant="construction" /></main>;
}
