import type { Metadata } from "next";
import { redirect } from "next/navigation";
import EDiskExperience from "@/components/e-disk/EDiskExperience";
import { E_DISK_VISIBLE } from "@/lib/ecommerce/product-visibility";

export const metadata: Metadata = {
  title: "e-disk — Evolve",
  description: "Il vinile incontra il digitale. La tua collezione, YouTube e il giradischi e-disk, in un unico spazio.",
};

export default function EDiskPage() {
  if (!E_DISK_VISIBLE) redirect("/negozio");
  return <EDiskExperience />;
}
