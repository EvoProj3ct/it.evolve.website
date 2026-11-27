import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ShopPageHeader } from "@/components/shop/ShopPreviewShared";
import { ShopRankGhost, shopRanks } from "@/components/shop/ShopRankGhost";
import common from "@/components/shop/CommercePreview.module.css";
import styles from "@/components/shop/Storefront.module.css";

export const metadata: Metadata = { title: "Livelli · Evolve Shop" };

export default async function ShopRanksPage() {
  if (!(await cookies()).has("__Host-storefront_session"))
    redirect("/account/login?next=%2Faccount%2Flivelli");

  return <main id="shop-content" className={common.page}>
    <ShopPageHeader title="I livelli dello shop" />
    <p className={styles.rankIntro}>Scopri i cinque gradi del futuro sistema a punti dello shop.</p>
    <ol className={styles.rankGrid}>
      {shopRanks.map(rank => <li key={rank.level}>
        <div className={styles.rankArt}><ShopRankGhost rank={rank} /></div>
        <div className={styles.rankCopy}>
          <span>Livello {rank.level}</span>
          <h2>{rank.name}</h2>
          <p>{rank.description}</p>
        </div>
      </li>)}
    </ol>
  </main>;
}
