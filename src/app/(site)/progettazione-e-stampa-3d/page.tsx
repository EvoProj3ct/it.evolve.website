import type { Metadata } from "next";
import { ThreeDServiceExperience } from "@/components/three-d/ThreeDServiceExperience";

export const metadata: Metadata = {
  title: "Progettazione e Stampa 3D | Evolve",
  description: "Uno spazio dedicato alla progettazione e alla stampa 3D di Evolve.",
};

export default function ThreeDServicePage() {
  return <ThreeDServiceExperience />;
}
