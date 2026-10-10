import { GhostMazeHero } from "@/components/GhostMazeHero";
import { HomeScrollReset } from "@/components/HomeScrollReset";
import { EvolveReveal } from "@/components/EvolveReveal";
import { BrandStatement } from "@/components/BrandStatement";
import { KnowledgeConstellation } from "@/components/KnowledgeConstellation";
import { ClientsGrid } from "@/components/ClientsGrid";

export default function Page() {
  return (
    <main>
      <HomeScrollReset />
      <GhostMazeHero />
      <EvolveReveal />
      <BrandStatement />
      <KnowledgeConstellation />
      <ClientsGrid />
    </main>
  );
}
