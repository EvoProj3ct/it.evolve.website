import Portfolio from "@/components/Portfolio";
import HeroHeaderWithMarquee from "@/components/HeroHeaderWithMarquee";
import PortfolioWhyUs from "@/components/PortfolioWhyUs";

export default function PortfolioPage() {
  return (
    <main className="portfolioPage" aria-label="Pagina Portfolio">
      <HeroHeaderWithMarquee />
      <Portfolio />
      <PortfolioWhyUs />
    </main>
  );
}
