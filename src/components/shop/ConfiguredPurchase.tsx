"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, ShoppingCart } from "lucide-react";
import type { ConfiguratorKind, PublicCatalogList, PublicCatalogProduct } from "@evolve/ecommerce-server/catalog";
import { money, publicIdSchema, type PersonalizationInput } from "@/lib/ecommerce/contracts";
import { addCatalogProduct } from "@/lib/ecommerce/cart";
import { errorText, StorefrontError, storefrontRead, subscribeSession } from "@/lib/ecommerce/browser";
import type { LogoAsset } from "./products";
import styles from "./Storefront.module.css";

export function configuratorHref(kind: ConfiguratorKind, id: string) {
  const page = kind.startsWith("e-disk") ? "e-disk" : kind;
  const bundle = kind === "e-disk-bundle";
  const hash = kind === "e-disk-disc" ? "incidi" : bundle ? "offerta-edisk" : "configura";
  return `/shop/${page}?articolo=${id}&tipo=${kind}${bundle ? "&offerta=bundle" : ""}#${hash}`;
}

async function rasterLogo(logo: LogoAsset) {
  const localUrl = logo.kind === "svg" ? URL.createObjectURL(new Blob([logo.data], { type: "image/svg+xml" })) : null;
  try {
    const image = new Image();
    image.src = localUrl ?? logo.data;
    await image.decode();
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    if (!context || !image.naturalWidth || !image.naturalHeight) throw new Error();
    for (const size of [512, 384, 256, 192, 128, 96]) {
      const scale = size / Math.max(image.naturalWidth, image.naturalHeight);
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      const png = canvas.toDataURL("image/png").split(",")[1];
      if (png && png.length <= 16384) return png;
    }
    throw new Error();
  } catch {
    throw new StorefrontError("Usa un logo più semplice per aggiungerlo al carrello.", 400, "PERSONALIZATION_INVALID");
  } finally {
    if (localUrl) URL.revokeObjectURL(localUrl);
  }
}

export function ConfiguredPurchase({ kind, prepare, disabled, buttonClass }: {
  kind: ConfiguratorKind;
  prepare: () => Omit<PersonalizationInput, "logo"> & { logoAsset?: LogoAsset | null };
  disabled?: boolean;
  buttonClass: string;
}) {
  const [products, setProducts] = useState<PublicCatalogProduct[]>([]);
  const [selected, setSelected] = useState("");
  const [cursor, setCursor] = useState("");
  const [next, setNext] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [retry, setRetry] = useState(0);
  const [catalogError, setCatalogError] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [outcome, setOutcome] = useState<"added" | "review" | null>(null);
  const pending = useRef<AbortController | null>(null);
  const product = selected ? products.find(item => item.id === selected) : products[0];

  useEffect(() => subscribeSession(() => {
    pending.current?.abort();
    setOutcome(null);
    setError("");
  }), []);
  useEffect(() => () => pending.current?.abort(), []);
  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;
    const query = new URLSearchParams({ configurator: kind, limit: "20" });
    if (cursor) query.set("cursor", cursor);
    const location = new URLSearchParams(window.location.search);
    const id = publicIdSchema.safeParse(location.get("tipo") === kind ? location.get("articolo") : null);
    setLoading(true);
    setCatalogError("");
    let retryTimer: number | undefined;
    async function load(canRetry: boolean) {
      try {
        const [page, requested] = await Promise.all([
          storefrontRead<PublicCatalogList>(`/catalog?${query}`, signal),
          !cursor && id.success
            ? storefrontRead<PublicCatalogProduct>(`/catalog/${id.data}`, signal).catch(() => null)
            : null,
        ]);
        if (signal.aborted) return;
        const items = page.items.filter(item => item.configurator === kind);
        if (requested?.configurator === kind && !items.some(item => item.id === requested.id)) items.unshift(requested);
        setProducts(current => cursor ? [...current, ...items.filter(item => !current.some(old => old.id === item.id))] : items);
        if (!cursor && id.success) setSelected(current => current || (items.some(item => item.id === id.data) ? id.data : ""));
        setNext(page.nextCursor);
      } catch (reason) {
        if (signal.aborted) return;
        if (canRetry && reason instanceof StorefrontError &&
            (reason.status === 0 || reason.status === 503 &&
              ["ATLAS_UNAVAILABLE", "ATLAS_SERVICE_REJECTED"].includes(reason.code))) {
          retryTimer = window.setTimeout(() => {
            retryTimer = undefined;
            void load(false);
          }, 600);
        } else setCatalogError(errorText(reason));
      } finally {
        if (!signal.aborted && retryTimer === undefined) setLoading(false);
      }
    }
    void load(true);
    return () => {
      controller.abort();
      window.clearTimeout(retryTimer);
    };
  }, [kind, cursor, retry]);

  async function add() {
    if (!product || pending.current) return;
    const controller = new AbortController();
    pending.current = controller;
    setBusy(true);
    setError("");
    setOutcome(null);
    try {
      const { logoAsset, ...options } = prepare();
      const logo = logoAsset ? await rasterLogo(logoAsset) : undefined;
      controller.signal.throwIfAborted();
      await addCatalogProduct(product, { ...options, logo }, controller.signal);
      if (!controller.signal.aborted) setOutcome("added");
    } catch (reason) {
      if (reason instanceof StorefrontError && reason.status === 401) setError("La sessione è scaduta. Premi di nuovo per aggiungere al carrello.");
      else if (!controller.signal.aborted) {
        if (reason instanceof StorefrontError && (reason.status === 409 || reason.status === 0 || reason.status >= 500)) setOutcome("review");
        setError(errorText(reason));
      }
    } finally {
      pending.current = null;
      setBusy(false);
    }
  }

  return <div className={styles.configuredPurchase}>
    {(products.length > 1 || products.length > 0 && !product) && <label>Articolo <select value={product?.id ?? ""} disabled={busy} onChange={event => setSelected(event.target.value)}>
      {!product && <option value="" disabled>Scegli un articolo disponibile</option>}
      {products.map(item => <option key={item.id} value={item.id}>{item.name} · {money(item.price.unitGrossCents)}</option>)}
    </select></label>}
    {product && <><p>{product.name} · <strong>{money(product.price.unitGrossCents)}</strong> IVA inclusa</p>
      <button type="button" className={buttonClass} disabled={busy || loading || disabled || outcome === "review"} onClick={() => void add()}>
        {busy ? "Aggiunta…" : "Aggiungi la configurazione al carrello"} <ShoppingCart size={18} />
      </button></>}
    {loading && <p role="status">Caricamento articoli…</p>}
    {catalogError && <p role="alert">{catalogError} <button type="button" onClick={() => setRetry(value => value + 1)}>Riprova</button></p>}
    {!loading && !catalogError && !product && <p>{products.length ? "L’articolo selezionato non è più disponibile. Scegline uno dall’elenco." : "Nessun articolo acquistabile è pubblicato per questo configuratore."}</p>}
    {next && <button type="button" className={styles.secondary} disabled={loading || busy} onClick={() => setCursor(next)}>Altri articoli</button>}
    {error && <p role="alert">{error}</p>}
    {(outcome === "review" || outcome === "added") && <Link href="/carrello" className={styles.secondary}>{outcome === "added" ? "Aggiunto · Apri il carrello" : "Controlla il carrello"} <ArrowRight size={16} /></Link>}
    {outcome === "review" && <button type="button" className={styles.secondary} disabled={loading} onClick={() => {
      setOutcome(null);
      setError("");
      setCursor("");
      setRetry(value => value + 1);
    }}>Ricarica gli articoli</button>}
  </div>;
}
