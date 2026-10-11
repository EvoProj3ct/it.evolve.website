import type { Metadata } from "next";
import { AgentServiceExperience } from "@/components/agents/AgentServiceExperience";

export const metadata: Metadata = {
  title: "Progettazione Agenti IA | Evolve",
  description:
    "Agenti IA mirati, progettati da Evolve per lavorare vicino ai tuoi dati su hardware compatto.",
};

export default function AgentServicePage() {
  return <AgentServiceExperience />;
}
