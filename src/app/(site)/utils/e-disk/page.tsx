import type { Metadata } from "next";
import EDiskExperience from "@/components/e-disk/EDiskExperience";

export const metadata: Metadata = {
  title: "e-disk — Evolve",
  description: "Il vinile incontra il digitale. La tua collezione, YouTube e il giradischi e-disk, in un unico spazio.",
};

export default function EDiskPage() {
  return <EDiskExperience />;
}
