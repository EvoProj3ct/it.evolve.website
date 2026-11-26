"use client";
import { useCallback, useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import type { PublicOrderTracking, PublicTrackingDeliveryDetails, PublicTrackingEvent, PublicTrackingTime, PublicTrackingTimeline } from "@evolve/ecommerce-server/tracking";
import { statusLabels } from "@/lib/ecommerce/contracts";
import { StorefrontError, storefrontRead } from "@/lib/ecommerce/browser";
import { useStorefrontResource } from "./useStorefrontResource";
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
  const load = useCallback((signal: AbortSignal) => storefrontRead<PublicTrackingTimeline>(`/orders/${orderId}/timeline${cursor || delivery ? `?${new URLSearchParams({ ...(cursor ? { cursor } : {}), ...(delivery ? { deliveryPublicId: delivery } : {}) })}` : ""}`, signal), [orderId, cursor, delivery]);
  const resource = useStorefrontResource(load);
  useEffect(() => {
    if (resource.data?.status === "not_available") { setEvents([]); unavailable(); }
    else if (resource.data?.status === "available") {
      if (resource.data.publicationVersion !== version) { setEvents([]); return; }
      const page = resource.data.events;
      setEvents(current => cursor ? [...current, ...page.filter(event => !current.some(old => old.publicId === event.publicId))] : page);
    }
    if (resource.error instanceof StorefrontError && resource.error.status === 404) { setEvents([]); unavailable(); }
  }, [resource.data, resource.error, cursor, version, unavailable]);
  const page = resource.data?.status === "available" ? resource.data : null;
  const nextCursor = page?.nextCursor;
  const mismatch = !!page && page.publicationVersion !== version || resource.error instanceof StorefrontError && resource.error.code === "TRACKING_CHANGED";
  return <section className={styles.timeline}>
    <h3>Aggiornamenti</h3>
    <ResourceFeedback busy={resource.busy} error={resource.error} reload={restart} next={`/account/ordini/${orderId}`} />
    {mismatch ? <p className={styles.notice}>Gli aggiornamenti sono cambiati.<button className={styles.secondary} type="button" onClick={restart}>Riparti dalla prima pagina</button></p> : !resource.error && !resource.busy && page && <>
      {!events.length && <p className={styles.help}>Non ci sono aggiornamenti pubblicati per questa selezione.</p>}
      <ol>{events.map(event => <li key={event.publicId}><span className={styles.status}>{event.status === "planned" ? "Programmato" : event.status === "completed" ? "Completato" : "Annullato"}</span><h4>{event.title}</h4>{event.text && <p>{event.text}</p>}<small>Previsione: {time(event.scheduled)}</small>{event.occurredAt && <small>Data effettiva: {actual(event.occurredAt)}</small>}</li>)}</ol>
      {nextCursor && <button type="button" className={styles.secondary} onClick={() => setCursor(nextCursor)}>Altri aggiornamenti</button>}
    </>}
  </section>;
}
function Delivery({ orderId, id, unavailable }: { orderId: string; id: string; unavailable: () => void }) {
  const load = useCallback((signal: AbortSignal) => storefrontRead<PublicTrackingDeliveryDetails>(`/orders/${orderId}/deliveries/${id}`, signal), [orderId, id]);
  const resource = useStorefrontResource(load);
  useEffect(() => { if (resource.error instanceof StorefrontError && resource.error.status === 404) unavailable(); }, [resource.error, unavailable]);
  return <div className={styles.notice}><ResourceFeedback busy={resource.busy} error={resource.error} reload={resource.reload} next={`/account/ordini/${orderId}`} />{resource.data && <><strong>{resource.data.delivery.label}</strong><p>{resource.data.delivery.message}</p><p>{statusLabels[resource.data.delivery.phase]}</p></>}</div>;
}
export function ShopTracking({ orderId }: { orderId: string }) {
  const [delivery, setDelivery] = useState("");
  const load = useCallback((signal: AbortSignal) => storefrontRead<PublicOrderTracking>(`/orders/${orderId}/tracking`, signal), [orderId]);
  const resource = useStorefrontResource(load);
  const unavailable = useCallback(() => { resource.setData({ orderPublicId: orderId, status: "not_available" }); setDelivery(""); }, [resource.setData, orderId]);
  const refresh = useCallback(() => { setDelivery(""); resource.reload(); }, [resource.reload]);
  const tracking = resource.data;
  return <section className={styles.orderSection}><div className={common.panelHeading}><h2>Il percorso del tuo ordine<span>.</span></h2><button type="button" className={styles.iconButton} disabled={resource.busy} onClick={refresh} aria-label="Aggiorna il tracking"><RefreshCw size={17} /></button></div><ResourceFeedback busy={resource.busy} error={resource.error} reload={refresh} next={`/account/ordini/${orderId}`} />{tracking?.status === "not_available" && <p className={styles.notice}>Gli aggiornamenti del tuo ordine saranno disponibili qui, appena pubblicati da Evolve.</p>}{tracking?.status === "available" && <><p className={styles.help}>Fase: {statusLabels[tracking.phase]} · Evasione: {statusLabels[tracking.fulfillmentStatus]}</p><div className={styles.deliveries}>{tracking.deliveries.map(item => <button type="button" key={item.publicId} className={styles.deliveryCard} aria-pressed={delivery === item.publicId} onClick={() => setDelivery(value => value === item.publicId ? "" : item.publicId)}><strong>{item.label}</strong><span>{statusLabels[item.phase]}</span>{item.message && <p>{item.message}</p>}{item.expected && <small>Previsione: {time(item.expected)}</small>}{item.shippedAt && <small>Spedito il {actual(item.shippedAt)}</small>}{item.completedAt && <small>Completato il {actual(item.completedAt)}</small>}</button>)}</div>{delivery && <Delivery key={delivery} orderId={orderId} id={delivery} unavailable={unavailable} />}<Timeline key={`${tracking.publicationVersion}-${delivery}`} orderId={orderId} delivery={delivery} version={tracking.publicationVersion} unavailable={unavailable} restart={refresh} /></>}</section>;
}
