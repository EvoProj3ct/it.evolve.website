"use client";
import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowRight, ArrowUpRight, ShoppingCart } from "lucide-react";
import type { PublicCatalogProduct } from "@evolve/ecommerce-server/catalog";
import { money, type PersonalizationInput } from "@/lib/ecommerce/contracts";
import { errorText, StorefrontError, subscribeSession } from "@/lib/ecommerce/browser";
import { useCatalogSnapshot } from "@/lib/ecommerce/catalog-snapshot";
import { addCatalogProduct } from "@/lib/ecommerce/cart";
import { catalogCacheAge, shopApi, useShopQueryView, useShopStore } from "@/lib/ecommerce/shop-store";
import { configuratorHref } from "./ConfiguredPurchase";
import { CatalogArtwork, ResourceFeedback, ShopPageHeader } from "./ShopPreviewShared";
import common from "./CommercePreview.module.css";
import styles from "./Storefront.module.css";

export function AddToCart({ product }: { product: PublicCatalogProduct }) {
  const store = useShopStore();
  const [busy, setBusy] = useState(false), [error, setError] = useState(""), [added, setAdded] = useState(false), [review, setReview] = useState(false);
  const [custom, setCustom] = useState(false), [withColor, setWithColor] = useState(false);
  const lock = useRef(false);
  const session = useRef(0);
  const pending = useRef<AbortController>(null);
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => subscribeSession(() => {
    session.current++;
    pending.current?.abort();
    formRef.current?.reset();
    setCustom(false);
    setWithColor(false);
    setAdded(false);
    setReview(false);
    setError("");
  }), []);
  useEffect(() => () => pending.current?.abort(), []);

  async function add(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (lock.current || added || review) return;
    const form = new FormData(event.currentTarget);
    const attempt = session.current;
    const controller = new AbortController();
    pending.current = controller;
    lock.current = true; setBusy(true); setError("");
    try {
      let personalization: PersonalizationInput | undefined;
      if (custom) {
        const color = withColor ? String(form.get("color")) : "";
        const inscription = String(form.get("inscription") ?? "").trim();
        const file = form.get("logo");
        let logo = "";
        if (file instanceof File && file.size) {
          if (!["image/png", "image/jpeg"].includes(file.type) || file.size > 12 * 1024)
            throw new StorefrontError("Carica un PNG o JPEG fino a 12 KiB.", 400, "PERSONALIZATION_INVALID");
          logo = btoa(String.fromCharCode(...new Uint8Array(await file.arrayBuffer())));
        }
        if (!color && !inscription && !logo)
          throw new StorefrontError("Scegli un colore, una scritta o un logo.", 400, "PERSONALIZATION_INVALID");
        personalization = { ...(color && { color }), ...(inscription && { inscription }), ...(logo && { logo }) };
      }
      if (attempt !== session.current) return;
      await addCatalogProduct(store, product, personalization, controller.signal);
      if (attempt === session.current) setAdded(true);
    } catch (reason) {
      if (reason instanceof StorefrontError && reason.status === 401) { setError("La sessione è scaduta. Premi di nuovo per aggiungere al carrello."); return; }
      if (controller.signal.aborted || attempt !== session.current) return;
      if (reason instanceof StorefrontError && (reason.status === 409 || reason.status >= 500 || reason.status === 0)) setReview(true);
      setError(errorText(reason));
    } finally { pending.current = null; lock.current = false; setBusy(false); }
  }
  return <div className={styles.purchase}>
    {added || review ? <Link href="/carrello" className={styles.primary}>{added ? "Nel tuo carrello" : "Rivedi il carrello"}<ArrowRight size={17} /></Link> :
      <form method="post" ref={formRef} onSubmit={add} className={styles.checkoutForm}>
        {product.kind === "physical" && <fieldset disabled={busy}>
          <legend>Personalizzazione</legend>
          <label className={styles.check}><input type="checkbox" checked={custom} onChange={event => setCustom(event.target.checked)} />Personalizza l’articolo</label>
          {custom && <div className={styles.fieldGrid}>
            <div className={styles.wideField}>
              <label className={styles.check}><input type="checkbox" checked={withColor} onChange={event => setWithColor(event.target.checked)} />Scegli un colore</label>
              {withColor && <input aria-label="Colore" type="color" name="color" defaultValue="#232323" />}
            </div>
            <label className={styles.wideField}>Scritta<input name="inscription" maxLength={80} /></label>
            <label className={styles.wideField}>Logo, PNG o JPEG fino a 12 KiB<input type="file" name="logo" accept="image/png,image/jpeg" /></label>
          </div>}
        </fieldset>}
        <button type="submit" disabled={busy} className={styles.primary}>{busy ? "Un momento…" : "Aggiungi al carrello"}<ShoppingCart size={17} /></button>
      </form>}
    {error && <p className={styles.error} role="alert">{error}</p>}
    {added && <p className={styles.success} role="status">Articolo aggiunto al carrello.</p>}
  </div>;
}
export function ShopCatalog() {
  const [cursor, setCursor] = useState("");
  const query = `limit=20${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}`;
  const snapshot = useCatalogSnapshot("catalog", query);
  const resource = useShopQueryView(shopApi.useCatalogQuery(query, { refetchOnMountOrArgChange: catalogCacheAge }),
    snapshot?.endpointName === "catalog" ? snapshot.value : undefined);
  const data = resource.data;
  return <main id="shop-content" className={common.page}><ShopPageHeader title="Oggetti, idee, connessioni" description="Le proposte disponibili, pubblicate da Evolve." /><ResourceFeedback busy={resource.busy} error={resource.error} reload={resource.reload} next="/negozio" />{data && <>{data.items.length ? <div className={styles.catalogGrid}>{data.items.map(product => <article key={product.id} className={styles.catalogCard}><Link href={`/negozio/${product.slug}`}><CatalogArtwork product={product} /><h2>{product.name}<span>.</span></h2><p>{product.description}</p></Link><div className={styles.catalogPrice}><span>{money(product.price.unitGrossCents)}<small>IVA inclusa</small></span><Link href={`/negozio/${product.slug}`} aria-label={`Scopri ${product.name}`}><ArrowUpRight size={22} /></Link></div></article>)}</div> : <p className={styles.notice}>Al momento non ci sono articoli pubblicati nello shop.</p>}<div className={styles.pagination}>{cursor && <button type="button" className={styles.secondary} onClick={() => setCursor("")}>Torna all’inizio</button>}{data.nextCursor && <button type="button" className={styles.secondary} onClick={() => setCursor(data!.nextCursor!)}>Altri oggetti <ArrowRight size={15} /></button>}</div></>}</main>;
}
export function ShopCatalogProduct({ slug }: { slug: string }) {
  const snapshot = useCatalogSnapshot("productPage", slug);
  const resource = useShopQueryView(shopApi.useProductPageQuery(slug, { refetchOnMountOrArgChange: catalogCacheAge }),
    snapshot?.endpointName === "productPage" ? snapshot.value : undefined);
  const product = resource.data;
  return <main id="shop-content" className={common.page}><ShopPageHeader title={product?.name || "Un oggetto, la tua idea"} description={product?.content.summary || "Scopri i dettagli della proposta Evolve."} /><ResourceFeedback busy={resource.busy} error={resource.error} reload={resource.reload} next={`/negozio/${slug}`} />{product && <><div className={styles.productGrid}><CatalogArtwork product={product} /><section className={styles.productInfo}><h2>{product.content.title || product.name}<span>.</span></h2><p>{product.description}</p><div className={styles.detailPrice}>{money(product.price.unitGrossCents)}<small>IVA inclusa{product.price.taxMode === "exclusive" && <> · {money(product.price.unitAmountCents)} IVA esclusa</>}</small></div><p className={styles.help}>Modalità: {product.fulfillmentModes.map(mode => ({ shipping: "spedizione", pickup: "ritiro", service: "servizio" })[mode]).join(", ")}. Le opzioni effettive saranno confermate al riepilogo.</p>{product.configurator ? <Link className={styles.primary} href={configuratorHref(product.configurator, product.id)}>Personalizza e acquista <ArrowRight size={17} /></Link> : <AddToCart key={`${product.id}-${product.revision}`} product={product} />}</section></div><div className={styles.productSections}>{product.content.sections.map((section, index) => <section key={`${section.heading}-${index}`}><h2>{section.heading}</h2><p>{section.text}</p></section>)}</div>{product.content.media.length > 0 && <div className={styles.mediaGrid}>{product.content.media.map(media => <figure key={media.id}><img src={media.url} alt={media.alt} width={media.width} height={media.height} loading="lazy" referrerPolicy="no-referrer" /></figure>)}</div>}</>}</main>;
}
