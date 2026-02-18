import Portfolio from "@/components/Portfolio";
import HeroHeaderWithMarquee from "@/components/HeroHeaderWithMarquee";

export default function PortfolioPage() {
    return (
        <main className="portfolioPage" aria-label="Pagina Portfolio">
            <HeroHeaderWithMarquee />
            <Portfolio />
        </main>
    );
}
