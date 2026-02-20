// app/about/page.tsx
import ChiSiamoTimelineSection from "@/components/ChiSiamo";

export const metadata = {
    title: "About | Evolve",
    description: "Chi è Evolve? Qual è il suo metodo?",
};

export default function Page() {
    return <ChiSiamoTimelineSection />;
}