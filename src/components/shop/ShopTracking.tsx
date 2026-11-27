"use client";
import { useCallback, useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import type { PublicTrackingEvent, PublicTrackingTime } from "@evolve/ecommerce-server/tracking";
import { statusLabels } from "@/lib/ecommerce/contracts";
import { hidesPreviousData, StorefrontError } from "@/lib/ecommerce/browser";
import { cacheShopEntries, orderCacheAge, shopApi, useShopQueryView, useShopStore } from "@/lib/ecommerce/shop-store";
import { ResourceFeedback } from "./ShopPreviewShared";
import common from "./CommercePreview.module.css";
import styles from "./Storefront.module.css";

function time(value: PublicTrackingTime) {
  if (value.kind === "date") return new Intl.DateTimeFormat("it-IT", { dateStyle: "long", timeZone: "UTC" }).format(new Date(`${value.date}T12:00:00Z`));
  const format = (text: string) => new Intl.DateTimeFormat("it-IT", { dateStyle: "medium", timeStyle: "short", timeZone: value.timeZone }).format(new Date(text));
  return value.kind === "window" ? `${format(value.startsAt)} – ${format(value.endsAt)} (${value.timeZone})` : `${format(value.startsAt)} (${value.timeZone})`;
}
function actual(value: string) { return new Intl.DateTimeFormat("it-IT", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Rome" }).format(new Date(value)); }
function Timeline({ orderId, delivery, version, unavailable, restart }: { orderId: string; delivery: string; version: number; unavailable: () => void; restart: () => void }) {
  const [cursor, setCursor] = useState(""), [events, setEvents] = useState<PublicTrackingEvent[]>([]);
  const resource = useShopQueryView(shopApi.useTrackingTimelineQuery({ orderId, delivery, cursor, version }, { refetchOnMountOrArgChange: orderCacheAge }));
  useEffect(() => {
    if (resource.data?.status === "not_available") { setEvents([]); unavailable(); }
    else if (resource.data?.status === "available") {
      if (resource.data.publicationVersion !== version) { setEvents([]); return; }
      const page = resource.data.events;
      setEvents(current => cursor ? [...current, ...page.filter(event => !current.some(old => old.publicId === event.publicId))] : page);
    }
    if (hidesPreviousData(resource.error)) {
      setEvents([]);
      if (resource.error instanceof StorefrontError && resource.error.status === 404) unavailable();
    }
  }, [resource.data, resource.error, cursor, version, unavailable]);
  const page = resource.data?.status === "available" ? resource.data : null;
  const nextCursor = page?.nextCursor;
  const mismatch = !!page && page.publicationVersion !== version || resource.error instanceof StorefrontError && resource.error.code === "TRACKING_CHANGED";
  function restartTimeline() {
    setCursor("");
    if (!cursor) resource.reload();
    restart();
  }
  return <section className={styles.timeline}>
    <h3>Aggiornamenti</h3>
    <ResourceFeedback busy={resource.busy && !events.length} error={resource.error} reload={mismatch ? restartTimeline : resource.reload} next={`/account/ordini/${orderId}`} />
    {mismatch ? <p className={styles.notice}>Gli aggiornamenti sono cambiati.<button className={styles.secondary} type="button" onClick={restartTimeline}>Riparti dalla prima pagina</button></p> : !hidesPreviousData(resource.error) && (events.length > 0 || page) && <>
      {!events.length && !resource.busy && <p className={styles.help}>Non ci sono aggiornamenti pubblicati per questa selezione.</p>}
      <ol>{events.map(event => <li key={event.publicId}><span className={styles.status}>{event.status === "planned" ? "Programmato" : event.status === "completed" ? "Completato" : "Annullato"}</span><h4>{event.title}</h4>{event.text && <p>{event.text}</p>}<small>Previsione: {time(event.scheduled)}</small>{event.occurredAt && <small>Data effettiva: {actual(event.occurredAt)}</small>}</li>)}</ol>
      {nextCursor && <button type="button" className={styles.secondary} disabled={resource.refreshing} onClick={() => setCursor(nextCursor)}>Altri aggiornamenti</button>}
    </>}
  </section>;
}
function Delivery({ orderId, id, version, unavailable }: { orderId: string; id: string; version: number; unavailable: () => void }) {
  const resource = useShopQueryView(shopApi.useTrackingDeliveryQuery({ orderId, id, version }, { refetchOnMountOrArgChange: orderCacheAge }));
  useEffect(() => { if (resource.error instanceof StorefrontError && resource.error.status === 404) unavailable(); }, [resource.error, unavailable]);
  return <div className={styles.notice}><ResourceFeedback busy={resource.busy} error={resource.error} reload={resource.reload} next={`/account/ordini/${orderId}`} />{resource.data && <><strong>{resource.data.delivery.label}</strong><p>{resource.data.delivery.message}</p><p>{statusLabels[resource.data.delivery.phase]}</p></>}</div>;
}
export function ShopTracking({ orderId }: { orderId: string }) {
  const store = useShopStore();
  const [delivery, setDelivery] = useState("");
  const resource = useShopQueryView(shopApi.useTrackingQuery(orderId, { refetchOnMountOrArgChange: orderCacheAge }));
  const unavailable = useCallback(() => {
    void cacheShopEntries(store, [{ endpointName: "tracking", arg: orderId, value: { orderPublicId: orderId, status: "not_available" } }]);
    setDelivery("");
  }, [store, orderId]);
  const refresh = resource.reload;
  const tracking = resource.data;
  const selectedDelivery = tracking?.status === "available" && tracking.deliveries.some(item => item.publicId === delivery) ? delivery : "";
  return <section className={styles.orderSection}><div className={common.panelHeading}><h2>Il percorso del tuo ordine<span>.</span></h2><button type="button" className={styles.iconButton} disabled={resource.busy || resource.refreshing} onClick={refresh} aria-label="Aggiorna il tracking"><RefreshCw size={17} /></button></div><ResourceFeedback busy={resource.busy} error={resource.error} reload={refresh} next={`/account/ordini/${orderId}`} />{tracking?.status === "not_available" && <p className={styles.notice}>Gli aggiornamenti del tuo ordine saranno disponibili qui, appena pubblicati da Evolve.</p>}{tracking?.status === "available" && <><p className={styles.help}>Fase: {statusLabels[tracking.phase]} · Evasione: {statusLabels[tracking.fulfillmentStatus]}</p><div className={styles.deliveries}>{tracking.deliveries.map(item => <button type="button" key={item.publicId} className={styles.deliveryCard} aria-pressed={selectedDelivery === item.publicId} onClick={() => setDelivery(value => value === item.publicId ? "" : item.publicId)}><strong>{item.label}</strong><span>{statusLabels[item.phase]}</span>{item.message && <p>{item.message}</p>}{item.expected && <small>Previsione: {time(item.expected)}</small>}{item.shippedAt && <small>Spedito il {actual(item.shippedAt)}</small>}{item.completedAt && <small>Completato il {actual(item.completedAt)}</small>}</button>)}</div>{selectedDelivery && <Delivery key={selectedDelivery} orderId={orderId} id={selectedDelivery} version={tracking.publicationVersion} unavailable={unavailable} />}<Timeline key={`${tracking.publicationVersion}-${selectedDelivery}`} orderId={orderId} delivery={selectedDelivery} version={tracking.publicationVersion} unavailable={unavailable} restart={refresh} /></>}</section>;
}
