"use client";

import { useEffect, useState, type FormEvent } from "react";
import { ArrowDown, ArrowRight } from "lucide-react";
import { z } from "zod";
import type { CustomerOrderListItem } from "@/lib/ecommerce/contracts";
import { hidesPreviousData } from "@/lib/ecommerce/browser";
import { orderCacheAge, shopApi, useShopQueryView } from "@/lib/ecommerce/shop-store";
import { ResourceFeedback } from "./ShopPreviewShared";
import common from "./CommercePreview.module.css";
import styles from "./Storefront.module.css";

const subjectLimit = 120;
const descriptionLimit = 3000;
const ticketSchema = z.object({
  id: z.string().uuid(),
  orderNumber: z.string().max(80),
  subject: z.string().trim().min(1).max(subjectLimit),
  description: z.string().trim().min(1).max(descriptionLimit),
  createdAt: z.string().datetime(),
}).strict();
type Ticket = z.infer<typeof ticketSchema>;

const orderDate = new Intl.DateTimeFormat("it-IT", { dateStyle: "long", timeZone: "Europe/Rome" });
const ticketDate = new Intl.DateTimeFormat("it-IT", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Rome" });

function readTickets(prefix: string): Ticket[] {
  if (typeof window === "undefined") return [];
  const tickets: Ticket[] = [];
  try {
    const storage = window.localStorage;
    for (let index = 0; index < storage.length; index++) {
      const key = storage.key(index);
      if (!key?.startsWith(prefix)) continue;
      const raw = storage.getItem(key);
      if (!raw) continue;
      try {
        const entry = ticketSchema.safeParse(JSON.parse(raw));
        if (entry.success) tickets.push(entry.data);
      } catch {
        continue;
      }
    }
  } catch {
    return [];
  }
  return tickets.sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

export function ShopSupportTickets({ accountId }: { accountId: string }) {
  const storagePrefix = `evolve:shop-support-v1:${accountId}:`;
  const [cursor, setCursor] = useState("");
  const [earlierOrders, setEarlierOrders] = useState<CustomerOrderListItem[]>([]);
  const [selectedOrder, setSelectedOrder] = useState("");
  const [tickets, setTickets] = useState(() => readTickets(storagePrefix));
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const resource = useShopQueryView(shopApi.useOrdersQuery(cursor ? `cursor=${encodeURIComponent(cursor)}` : "", {
    refetchOnMountOrArgChange: orderCacheAge,
  }));
  const orders = new Map<string, CustomerOrderListItem>();
  if (!hidesPreviousData(resource.error)) {
    for (const order of earlierOrders) orders.set(order.id, order);
    for (const order of resource.data?.items ?? []) orders.set(order.id, order);
  }
  const nextCursor = resource.data?.nextCursor;

  useEffect(() => {
    function syncTickets(event: StorageEvent) {
      if (event.key === null || event.key.startsWith(storagePrefix)) setTickets(readTickets(storagePrefix));
    }
    window.addEventListener("storage", syncTickets);
    return () => window.removeEventListener("storage", syncTickets);
  }, [storagePrefix]);

  function loadMoreOrders() {
    if (!nextCursor || nextCursor === cursor) return;
    setEarlierOrders([...orders.values()]);
    setCursor(nextCursor);
  }

  function saveTicket(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    const form = event.currentTarget;
    const data = new FormData(form);
    const order = orders.get(selectedOrder);
    if (!order) {
      setError("Scegli un ordine.");
      return;
    }
    try {
      const ticket = ticketSchema.safeParse({
        id: crypto.randomUUID(),
        orderNumber: order.number,
        subject: data.get("subject"),
        description: data.get("description"),
        createdAt: new Date().toISOString(),
      });
      if (!ticket.success) {
        setError("Compila l’oggetto e la descrizione del problema.");
        return;
      }
      window.localStorage.setItem(storagePrefix + ticket.data.id, JSON.stringify(ticket.data));
      setTickets(readTickets(storagePrefix));
      form.reset();
      setSelectedOrder("");
      setMessage("Ticket salvato su questo browser.");
    } catch {
      setError("Impossibile salvare il ticket su questo browser.");
    }
  }

  return <>
    <div className={common.panelHeading}><h2>Segnala un problema<span>.</span></h2></div>
    <p id="support-ticket-notice" className={styles.notice}>I ticket vengono salvati su questo browser. L’invio all’assistenza sarà disponibile più avanti.</p>
    <ResourceFeedback busy={resource.busy && !orders.size} error={resource.error} reload={resource.reload} />
    {resource.data && !orders.size && !nextCursor && <p className={styles.help}>Quando effettui un ordine, potrai selezionarlo qui.</p>}
    {(orders.size > 0 || nextCursor) && <form className={`${styles.form} ${styles.supportForm}`} method="post"
      aria-describedby="support-ticket-notice" onSubmit={saveTicket}>
      <label htmlFor="support-order">Ordine
        <select id="support-order" required value={selectedOrder} onChange={event => setSelectedOrder(event.target.value)}>
          <option value="">Seleziona un ordine</option>
          {[...orders.values()].map(order => <option key={order.id} value={order.id}>
            {order.number} · {orderDate.format(new Date(order.placedAt))}
          </option>)}
        </select>
      </label>
      {nextCursor && nextCursor !== cursor && <button className={styles.secondary} type="button" onClick={loadMoreOrders} disabled={resource.refreshing}>
        Carica ordini precedenti <ArrowDown size={15} />
      </button>}
      {resource.busy && orders.size > 0 && <p className={styles.help} role="status">Caricamento degli altri ordini…</p>}
      <label htmlFor="support-subject">Oggetto
        <input id="support-subject" name="subject" maxLength={subjectLimit} required />
      </label>
      <label htmlFor="support-description">Descrizione del problema
        <textarea id="support-description" name="description" rows={5} maxLength={descriptionLimit} required />
      </label>
      <button className={styles.primary} type="submit" disabled={!orders.has(selectedOrder)}>
        Salva ticket <ArrowRight size={17} />
      </button>
    </form>}
    {error && <p className={styles.error} role="alert">{error}</p>}
    {message && <p className={styles.success} role="status">{message}</p>}

    <section className={styles.supportHistory} aria-labelledby="support-history-title">
      <div className={common.panelHeading}><h2 id="support-history-title">Ticket precedenti<span>.</span></h2></div>
      {tickets.length ? <ul>
        {tickets.map(ticket => <li key={ticket.id}>
          <details>
            <summary>
              <span><strong>{ticket.subject}</strong><small>{ticket.orderNumber} · <time dateTime={ticket.createdAt}>{ticketDate.format(new Date(ticket.createdAt))}</time></small></span>
            </summary>
            <p>{ticket.description}</p>
          </details>
        </li>)}
      </ul> : <p className={styles.help}>Non ci sono ancora ticket salvati.</p>}
    </section>
  </>;
}
