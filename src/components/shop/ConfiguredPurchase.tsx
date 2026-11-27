"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, Check, Minus, Plus, ShoppingCart } from "lucide-react";
import type { ConfiguratorKind, PublicCatalogProduct } from "@evolve/ecommerce-server/catalog";
import { isLinkerOfferKind, linkerBundleSize } from "@evolve/ecommerce-server/keyring-offers";
import { GhostLoading } from "@/components/GhostLoading";
import { money, publicIdSchema, type PersonalizationInput } from "@/lib/ecommerce/contracts";
import { addCatalogProduct } from "@/lib/ecommerce/cart";
import { errorText, hidesPreviousData, StorefrontError, subscribeSession } from "@/lib/ecommerce/browser";
import { readCatalogSnapshot } from "@/lib/ecommerce/catalog-snapshot";
import { cachedShopData, shopApi, shopReads, useShopStore } from "@/lib/ecommerce/shop-store";
import type { LogoAsset } from "./products";
import common from "./CommercePreview.module.css";
import styles from "./Storefront.module.css";

export function configuratorHref(kind: ConfiguratorKind, id: string) {
  const page = kind.startsWith("e-disk") ? "e-disk" : isLinkerOfferKind(kind) ? "e-linker" : kind;
  const bundle = kind === "e-disk-bundle";
  const hash = kind === "e-disk-disc" ? "incidi" : bundle ? "offerta-edisk" : linkerBundleSize(kind) ? "offerta-e-linker" : "configura";
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
  const store = useShopStore();
  const [products, setProducts] = useState<PublicCatalogProduct[]>([]);
  const [selected, setSelected] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [cursor, setCursor] = useState("");
  const [next, setNext] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [retry, setRetry] = useState(0);
  const lastRetry = useRef(0);
  const [catalogError, setCatalogError] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [outcome, setOutcome] = useState<"added" | "review" | null>(null);
  const pending = useRef<AbortController | null>(null);
  const product = selected ? products.find(item => item.id === selected) : products[0];
  const bundleSize = linkerBundleSize(kind);
  const linkerOffer = isLinkerOfferKind(kind);
  const policy = cachedShopData(shopApi.endpoints.checkoutOptions.select()(store.getState()));
  const maxQuantity = policy?.maxQuantity ?? 1000;
  const selectedQuantity = linkerOffer ? Math.min(quantity, maxQuantity) : 1;
  const totalKeyrings = selectedQuantity * (bundleSize ?? 1);
  const goToCheckout = outcome === "added" && linkerOffer;

  useEffect(() => subscribeSession(() => {
    pending.current?.abort();
    setOutcome(null);
    setError("");
  }), []);
  useEffect(() => () => pending.current?.abort(), []);
  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;
    const query = new URLSearchParams({ limit: "20", configurator: kind });
    if (cursor) query.set("cursor", cursor);
    const location = new URLSearchParams(window.location.search);
    const id = publicIdSchema.safeParse(location.get("tipo") === kind ? location.get("articolo") : null);
    const queryKey = query.toString();
    setLoading(true);
    setCatalogError("");
    const refresh = lastRetry.current !== retry;
    lastRetry.current = retry;
    let retryTimer: number | undefined;
    function show(items: PublicCatalogProduct[], nextCursor: string | null) {
      setProducts(current => {
        if (!cursor) return items;
        const byId = new Map(current.map(item => [item.id, item]));
        for (const item of items) byId.set(item.id, item);
        return Array.from(byId.values());
      });
      if (!cursor && id.success) setSelected(current => current || (items.some(item => item.id === id.data) ? id.data : ""));
      setNext(nextCursor);
    }
    async function load(canRetry: boolean, force: boolean) {
      try {
        const fresh = shopReads.catalog(store, queryKey, force);
        const state = store.getState();
        const entry = shopApi.endpoints.catalog.select(queryKey)(state);
        const snapshot = !entry.data && readCatalogSnapshot("catalog", queryKey);
        const cached = cachedShopData(entry) ?? (snapshot && snapshot.endpointName === "catalog" ? snapshot.value : undefined);
        const previous = cached?.items.filter(item => item.configurator === kind) ?? [];
        if (!cursor && id.success && !previous.some(item => item.id === id.data)) {
          const detail = shopApi.endpoints.catalogProduct.select(id.data)(state);
          const saved = !detail.data && readCatalogSnapshot("catalogProduct", id.data);
          const requested = cachedShopData(detail) ?? (saved && saved.endpointName === "catalogProduct" ? saved.value : undefined);
          if (requested?.configurator === kind) previous.unshift(requested);
        }
        if (previous.length && (cursor || !id.success || previous.some(item => item.id === id.data))) show(previous, cached?.nextCursor ?? null);
        const page = await fresh;
        if (signal.aborted) return;
        const items = page.items.filter(item => item.configurator === kind);
        const requested = !cursor && id.success && !items.some(item => item.id === id.data)
          ? await shopReads.catalogProduct(store, id.data, force).catch(() => null)
          : null;
        if (signal.aborted) return;
        if (requested?.configurator === kind && !items.some(item => item.id === requested.id)) items.unshift(requested);
        show(items, page.nextCursor);
      } catch (reason) {
        if (signal.aborted) return;
        if (hidesPreviousData(reason)) { setProducts([]); setNext(null); }
        if (canRetry && reason instanceof StorefrontError &&
            (reason.status === 0 || reason.status === 503 &&
              ["ATLAS_UNAVAILABLE", "ATLAS_SERVICE_REJECTED"].includes(reason.code))) {
          retryTimer = window.setTimeout(() => {
            retryTimer = undefined;
            void load(false, true);
          }, 600);
        } else setCatalogError(errorText(reason));
      } finally {
        if (!signal.aborted && retryTimer === undefined) setLoading(false);
      }
    }
    void load(true, refresh);
    return () => {
      controller.abort();
      window.clearTimeout(retryTimer);
    };
  }, [kind, cursor, retry, store]);

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
      await addCatalogProduct(store, product, { ...options, logo }, controller.signal, selectedQuantity);
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
    {(products.length > 1 || products.length > 0 && !product) && <label>Articolo <select value={product?.id ?? ""} disabled={busy} onChange={event => {
      setSelected(event.target.value);
      setQuantity(1);
    }}>
      {!product && <option value="" disabled>Scegli un articolo disponibile</option>}
      {products.map(item => <option key={item.id} value={item.id}>{item.name} · {money(item.price.unitGrossCents)}</option>)}
    </select></label>}
    {product && <><p>{product.name} · <strong>{money(product.price.unitGrossCents)}</strong>
      {linkerOffer && (bundleSize ? " a confezione" : " cad.")} IVA inclusa
      {bundleSize && <> · {bundleSize} pezzi per confezione</>}</p>
      {linkerOffer && !goToCheckout && <div className={styles.configuredQuantity}>
        <span>{bundleSize ? "Confezioni" : "Quantità"}</span>
        <div className={common.quantity} role="group" aria-label={bundleSize ? "Numero di confezioni" : "Numero di portachiavi"}>
          <button type="button" aria-label="Diminuisci quantità" disabled={busy || selectedQuantity <= 1}
            onClick={() => setQuantity(current => Math.max(1, Math.min(current, maxQuantity) - 1))}><Minus size={14} /></button>
          <span>{selectedQuantity}</span>
          <button type="button" aria-label="Aumenta quantità" disabled={busy || selectedQuantity >= maxQuantity}
            onClick={() => setQuantity(current => Math.min(maxQuantity, current + 1))}><Plus size={14} /></button>
        </div>
        <span className={styles.configuredQuantityTotal} aria-live="polite">
          {totalKeyrings.toLocaleString("it-IT")} portachiavi in tutto
        </span>
      </div>}
      {!goToCheckout && <button type="button" className={buttonClass} disabled={busy || loading || disabled || outcome === "review"} onClick={() => void add()}>
        {busy ? "Aggiunta…" : bundleSize ? "Aggiungi il bundle al carrello" : "Aggiungi la configurazione al carrello"} <ShoppingCart size={18} />
      </button>}</>}
    {goToCheckout && <div className={styles.checkoutAdded}>
      <p role="status"><Check size={16} aria-hidden="true" /> Aggiunto al carrello</p>
      <Link href="/checkout" prefetch={false} className={buttonClass}>Vai al checkout <ArrowRight size={18} /></Link>
      <Link href="/carrello" prefetch={false} className={styles.secondary}>Vedi il carrello</Link>
      <button type="button" className={styles.secondary} onClick={() => { setQuantity(1); setOutcome(null); }}>Configura un altro articolo</button>
    </div>}
    {loading && !products.length && <GhostLoading label="Caricamento articoli…" />}
    {catalogError && <p role="alert">{catalogError} <button type="button" onClick={() => setRetry(value => value + 1)}>Riprova</button></p>}
    {!loading && !catalogError && !product && <p>{products.length ? "L’articolo selezionato non è più disponibile. Scegline uno dall’elenco." : bundleSize ? "Questo bundle non è ancora acquistabile online." : "Nessun articolo acquistabile è pubblicato per questo configuratore."}</p>}
    {next && <button type="button" className={styles.secondary} disabled={loading || busy} onClick={() => setCursor(next)}>Altri articoli</button>}
    {error && <p role="alert">{error}</p>}
    {(outcome === "review" || outcome === "added" && !goToCheckout) && <Link href="/carrello" className={styles.secondary}>{outcome === "added" ? "Aggiunto · Apri il carrello" : "Controlla il carrello"} <ArrowRight size={16} /></Link>}
    {outcome === "review" && <button type="button" className={styles.secondary} disabled={loading} onClick={() => {
      setOutcome(null);
      setError("");
      setCursor("");
      setRetry(value => value + 1);
    }}>Ricarica gli articoli</button>}
  </div>;
}
