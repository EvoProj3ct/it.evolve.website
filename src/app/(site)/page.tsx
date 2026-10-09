import { GhostMazeHero } from "@/components/GhostMazeHero";
import { EvolveReveal } from "@/components/EvolveReveal";
import { ServicesSection } from "@/components/ServicesSection";
import { AboutSplit } from "@/components/AboutSplit";
import { PortfolioCollage } from "@/components/PortfolioCollage";
import { TestimonialsSlider } from "@/components/TestimonialsSlider";
import { ClientsTape } from "@/components/ClientsTape";
import { ClientsGrid } from "@/components/ClientsGrid";
import { StayUpdatedBanner } from "@/components/StayUpdatedBanner";
import { TeamStrip } from "@/components/TeamStrip";

export default function Page() {
  return (
    <main>
      <GhostMazeHero />
      <EvolveReveal />
      <ServicesSection />
      <AboutSplit />
      <PortfolioCollage />
      <TestimonialsSlider />
      <ClientsTape />
      <ClientsGrid />
      <StayUpdatedBanner />
      <TeamStrip />
    </main>
  );
}
