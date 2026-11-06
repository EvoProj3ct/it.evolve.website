import Link from "next/link";
import { ArrowLeft, Check } from "lucide-react";
import type { CSSProperties } from "react";
import { ProductIllustration } from "./ProductIllustration";
import type { PreviewProduct } from "./commercePreview";
import styles from "./CommercePreview.module.css";

export function PreviewPageHeader({ title, description }: { title: string; description: string }) {
  return <>
    <div className={styles.topline}>
      <Link href="/shop" className={styles.backLink}><ArrowLeft size={15} /> Torna agli oggetti</Link>
      <div className={styles.previewNote}><span><i />Anteprima</span><p>Dati e importi di esempio</p></div>
    </div>
    <header className={styles.pageHeading}><h1>{title}<span>.</span></h1><p>{description}</p></header>
  </>;
}

export function PreviewProductArtwork({ item, className = "" }: { item: PreviewProduct; className?: string }) {
  return <div className={`${styles.artwork} ${className}`} data-product={item.product} aria-hidden="true" style={{ "--preview-light": item.configuration.secondary } as CSSProperties}>
    {item.product === "e-led" ? <><div className={styles.neonOrbit} /><span className={styles.neonWord}>{item.configuration.text}</span><span className={styles.neonReflection}>{item.configuration.text}</span></> : <ProductIllustration product={item.product} configuration={item.configuration} showChain={item.product === "e-linker"} />}
  </div>;
}

export function PreviewFinish({ item }: { item: PreviewProduct }) {
  return <span className={styles.finish}><span className={styles.finishChips} aria-hidden="true"><i style={{ background: item.configuration.primary }} /><i style={{ background: item.configuration.secondary }} /></span>{item.finish}</span>;
}

export function OrderProgress({ step }: { step: number }) {
  return <ol className={styles.orderProgress} aria-label="Avanzamento dell’ordine di esempio">
    {["Confermato", "In lavorazione", "Spedito", "A casa tua"].map((label, index) => <li key={label} data-complete={index < step} data-current={index === step} aria-current={index === step ? "step" : undefined}><span>{index < step ? <Check size={10} strokeWidth={2.5} /> : <i />}</span>{label}</li>)}
  </ol>;
}
