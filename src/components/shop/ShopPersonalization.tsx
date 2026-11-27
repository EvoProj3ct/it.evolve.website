import type { PersonalizationSummary } from "@/lib/ecommerce/contracts";
import { linkerBundleSize } from "@evolve/ecommerce-server/keyring-offers";

export function PersonalizationText({ value }: { value: PersonalizationSummary }) {
  const details = value.details;
  const bundleSize = linkerBundleSize(details?.kind);
  const secondary = details && "secondaryColor" in details ? details.secondaryColor : undefined;
  const label = details?.kind === "e-disk-disc" ? "Titolo" : "Scritta";
  return <small>{[
    value.color && `Colore ${value.color}`,
    secondary && `Secondario ${secondary}`,
    value.inscription && `${label} «${value.inscription}»`,
    bundleSize && `${bundleSize} portachiavi per confezione`,
    details && "shape" in details && ({ rectangle: "Rettangolo", square: "Quadrato", circle: "Cerchio", triangle: "Triangolo" })[details.shape],
    details?.kind === "e-disk-disc" && details.dedication && `Dedica «${details.dedication}»`,
    details?.kind === "e-disk-disc" && details.trackUrl && `Brano ${details.trackUrl.includes("spotify.com") ? "Spotify" : "YouTube"}`,
    details?.kind === "e-disk-bundle" && details.discs.map(disc => `«${disc.title}» · ${disc.color}${disc.dedication ? ` · ${disc.dedication}` : ""}`).join(" / "),
    details?.kind === "e-led" && `${({ flow: "Color flow", steady: "Fissa", breathe: "Respiro", pulse: "Pulse" })[details.effect]} · ${details.width} cm indicativi · ${details.brightness}%`,
    details?.kind === "e-led" && details.speedTenths && `Velocità ×${(details.speedTenths / 10).toLocaleString("it-IT")}`,
    value.hasLogo && "Logo allegato",
  ].filter(Boolean).join(" · ")}</small>;
}
