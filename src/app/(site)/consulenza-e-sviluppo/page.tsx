import type { Metadata } from "next";
import { ConsultingDevelopmentExperience } from "@/components/consulting/ConsultingDevelopmentDiagram";

export const metadata: Metadata = {
  title: "Consulenza e Sviluppo | Evolve",
  description:
    "Dalla consulenza al piano, fino ad agenti IA, software su misura e processi più efficaci: il metodo Evolve parte dalle esigenze reali.",
};

export default function ConsultingDevelopmentPage() {
  return <main><ConsultingDevelopmentExperience /></main>;
}
