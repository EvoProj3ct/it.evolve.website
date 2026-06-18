import { HeroSlider } from "@/components/HeroSlider";
import { ServicesSection } from "@/components/ServicesSection";
import { AboutSplit } from "@/components/AboutSplit";
import { PortfolioCollage } from "@/components/PortfolioCollage";
import { TestimonialsSlider } from "@/components/TestimonialsSlider";
import { ClientsTape } from "@/components/ClientsTape";
import { ClientsGrid } from "@/components/ClientsGrid";
import { TeamStrip } from "@/components/TeamStrip";

export default function Page() {
  return (
    <main>
      <HeroSlider />
      <ServicesSection />
      <AboutSplit />
      <PortfolioCollage />
      <TestimonialsSlider />
      <ClientsTape />
      <ClientsGrid />
      <TeamStrip />
    </main>
  );
}
