import { Navbar } from "@/components/Navbar";
import { HeroSlider } from "@/components/HeroSlider";
import { ServicesSection } from "@/components/ServicesSection";
import { AboutSplit } from "@/components/AboutSplit";
import { PortfolioCollage} from "@/components/PortfolioCollage";



export default function Page() {
  return (
      <main>
        <Navbar />
        <HeroSlider />
        <ServicesSection />
        <AboutSplit />
        <PortfolioCollage />
      </main>
  );
}
