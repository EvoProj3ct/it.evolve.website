import type { PersonalizationSummary } from "@/lib/ecommerce/contracts";
import { linkerBundleSize } from "@evolve/ecommerce-server/keyring-offers";
import { keyringDesignLabels } from "@evolve/ecommerce-server/keyring-design";

export function PersonalizationText({ value, quantity = 1 }: { value: PersonalizationSummary; quantity?: number }) {
  const details = value.details;
  const bundleSize = linkerBundleSize(details?.kind);
  const secondary = details && "secondaryColor" in details ? details.secondaryColor : undefined;
  const label = details?.kind === "e-disk-disc" ? "Titolo" : "Scritta";
  const design = details && "shape" in details ? keyringDesignLabels(details.shape, value.inscription, details) : undefined;
  return <small>{[
    value.color && `Colore ${value.color}`,
    secondary && `Secondario ${secondary}`,
    !design && value.inscription && `${label} «${value.inscription}»`,
    bundleSize && `${bundleSize} portachiavi per confezione`,
    bundleSize && quantity > 1 && `${(bundleSize * quantity).toLocaleString("it-IT")} portachiavi in tutto`,
    ...(design ?? []),
    details?.kind === "e-disk-disc" && details.dedication && `Dedica «${details.dedication}»`,
    details?.kind === "e-disk-disc" && details.trackUrl && `Brano ${details.trackUrl.includes("spotify.com") ? "Spotify" : "YouTube"}`,
    details?.kind === "e-disk-bundle" && details.discs.map(disc => `«${disc.title}» · ${disc.color}${disc.dedication ? ` · ${disc.dedication}` : ""}`).join(" / "),
    details?.kind === "e-led" && `${({ flow: "Color flow", steady: "Fissa", breathe: "Respiro", pulse: "Pulse" })[details.effect]} · ${details.width} cm indicativi · ${details.brightness}%`,
    details?.kind === "e-led" && details.speedTenths && `Velocità ×${(details.speedTenths / 10).toLocaleString("it-IT")}`,
    value.hasLogo && "Logo allegato",
  ].filter(Boolean).join(" · ")}</small>;
}
