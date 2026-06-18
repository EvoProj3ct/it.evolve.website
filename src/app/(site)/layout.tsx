import { IntroLoader } from "@/components/IntroLoader";
import { SiteFooter } from "@/components/Footer";
import { Navbar } from "@/components/Navbar";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Navbar />
      <IntroLoader />
      {children}
      <SiteFooter />
    </>
  );
}
