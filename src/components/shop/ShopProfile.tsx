"use client";

import Link from "next/link";
import { useRef, useState, type FormEvent } from "react";
import { ArrowRight, ArrowUpRight, FileText, LayoutGrid, LogOut, MessageSquareWarning, Package, RefreshCw, Settings2 } from "lucide-react";
import { customerLinkSchema, profileSchema, type Account } from "@/lib/ecommerce/contracts";
import { errorText, hidesPreviousData, storefrontMutate } from "@/lib/ecommerce/browser";
import { orderGroups, type OrderStatusKind } from "@/lib/ecommerce/order-progress";
import { announceShopPreference, cacheShopEntries, orderCacheAge, shopApi, shopQueryError, useShopQueryView, useShopStore } from "@/lib/ecommerce/shop-store";
import { OrderStatusGhost } from "./OrderStatusGhost";
import { ShopBillingProfile } from "./ShopBillingProfile";
import { ResourceFeedback, ShopPageHeader } from "./ShopPreviewShared";
import { previewShopRank, shopRanks, ShopRankGhost } from "./ShopRankGhost";
import { ShopSupportTickets } from "./ShopSupportTickets";
import styles from "./CommercePreview.module.css";
import live from "./Storefront.module.css";

export function CustomerLinkStatus() {
  const store = useShopStore();
  const resource = shopApi.useCustomerLinkQuery(undefined, { refetchOnMountOrArgChange: 45 });
  const [busy, setBusy] = useState(false), [error, setError] = useState("");
  const lock = useRef(false);

  async function resolve() {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      const value = await storefrontMutate("/me/customer-link", "POST", {}, customerLinkSchema);
      await cacheShopEntries(store, [{ endpointName: "customerLink", arg: undefined, value }]);
      announceShopPreference("CustomerLink");
    } catch (reason) {
      setError(errorText(reason));
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }

  const queryError = resource.error && shopQueryError(resource.error);
  const link = hidesPreviousData(queryError) ? undefined : resource.currentData;
  return <section className={live.customerStatus} aria-label="Stato del profilo commerciale">
    <ResourceFeedback busy={!link && resource.isFetching} error={queryError}
      reload={resource.refetch} />
    {link && <>
      <span className={live.status} data-ready={link.checkoutReady}>
        <i />{link.checkoutReady ? "Profilo pronto per acquistare" : "Verifica del profilo"}
      </span>
      <p>{link.message}</p>
      {!link.checkoutReady && <button type="button" className={live.secondary} onClick={() => void resolve()} disabled={busy}>
        {busy ? "Aggiornamento…" : "Aggiorna il profilo"}<RefreshCw size={14} />
      </button>}
    </>}
    {error && <p className={live.error} role="alert">{error}</p>}
  </section>;
}

function PersonalDetails({ account }: { account: Account }) {
  const store = useShopStore();
  const [busy, setBusy] = useState(false), [error, setError] = useState(""), [message, setMessage] = useState("");
  const lock = useRef(false);
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (lock.current) return;
    const data = new FormData(event.currentTarget);
    lock.current = true;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const value = await storefrontMutate("/me", "PATCH", { name: data.get("name"), phone: data.get("phone") }, profileSchema);
      await cacheShopEntries(store, [{ endpointName: "profile", arg: undefined, value }]);
      store.dispatch(shopApi.util.invalidateTags(["CustomerLink"]));
      announceShopPreference("Profile");
      setMessage("Profilo aggiornato.");
    } catch (reason) {
      setError(errorText(reason));
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }

  return <>
    <div className={styles.panelHeading}><h2>Il tuo profilo<span>.</span></h2></div>
    <p className={live.help}>Account {account.kind === "company" ? "azienda" : "privato"} · Email verificata</p>
    <form method="post" className={live.form} onSubmit={save}>
      <label htmlFor="profile-name">{account.kind === "company" ? "Ragione sociale" : "Nome e cognome"}
        <input id="profile-name" name="name" required maxLength={200} defaultValue={account.name} autoComplete="name" />
      </label>
      <label htmlFor="profile-phone">Telefono facoltativo
        <input id="profile-phone" name="phone" maxLength={40} defaultValue={account.phone || ""} type="tel" autoComplete="tel" />
      </label>
      <p className={live.help}>{account.email}</p>
      <button type="submit" className={live.primary} disabled={busy}>{busy ? "Salvataggio…" : "Salva le modifiche"}<ArrowRight size={17} /></button>
    </form>
    {error && <p className={live.error} role="alert">{error}</p>}
    {message && <p className={live.success} role="status">{message}</p>}
    <div className={live.credentialLinks}>
      <Link href="/account/change-email" prefetch={false}>Cambia email <ArrowUpRight size={14} /></Link>
      <Link href="/account/change-password" prefetch={false}>Cambia password <ArrowUpRight size={14} /></Link>
      <Link href="/account/logout-all" prefetch={false}>Esci da tutti i dispositivi <ArrowUpRight size={14} /></Link>
    </div>
  </>;
}

const sectionLabels = { overview: "Panoramica", profile: "Dati personali", billing: "Fatturazione", support: "Segnala un problema" };
const previewExperience = 0;
const nextRankExperience = 500;

function AccountOverview() {
  const { data: counts, error, busy, reload } = useShopQueryView(
    shopApi.useOrderStatusCountsQuery(undefined, { refetchOnMountOrArgChange: orderCacheAge }),
  );
  const orderStates = counts ? (Object.keys(orderGroups) as OrderStatusKind[]).filter(kind => counts[kind] > 0) : [];
  const nextRank = shopRanks.find(rank => rank.level === previewShopRank.level + 1);

  return <div className={live.profileOverview}>
    <Link href="/account/livelli" className={live.overviewRank}>
      <div className={live.overviewRankIdentity}>
        <ShopRankGhost rank={previewShopRank} className={live.overviewRankGhost} />
        <div><span>Livello {previewShopRank.level}</span><strong>{previewShopRank.name}</strong></div>
      </div>
      <ArrowUpRight size={18} aria-hidden="true" />
      {nextRank && <div className={live.overviewRankProgress}>
        <div className={live.overviewRankTrack}>
          <span aria-hidden="true">{previewExperience}/{nextRankExperience} EXP</span>
          <progress value={previewExperience} max={nextRankExperience}
            aria-label={`Esperienza verso ${nextRank.name}`} aria-valuetext={`${previewExperience} su ${nextRankExperience} EXP`} />
        </div>
        <div className={live.overviewRankNext}>
          <ShopRankGhost rank={nextRank} />
          <span>{nextRank.name}</span>
        </div>
      </div>}
    </Link>
    <section aria-labelledby="overview-orders-title">
      <div className={styles.panelHeading}>
        <h2 id="overview-orders-title">Ordini per stato<span>.</span></h2>
        <Link href="/account/ordini" className={styles.textLink}>Tutti gli ordini <ArrowUpRight size={15} /></Link>
      </div>
      <ResourceFeedback busy={busy} error={error} reload={reload} />
      {counts && (orderStates.length ? <dl className={live.orderCounts}>
        {orderStates.map(kind => (
          <div key={kind} className={live.orderCount} data-section={kind}>
            <dt><OrderStatusGhost kind={kind} /><span>{orderGroups[kind]}</span></dt>
            <dd>{counts[kind].toLocaleString("it-IT")}</dd>
          </div>
        ))}
      </dl> : <p className={live.notice}>Non ci sono ancora ordini.</p>)}
    </section>
  </div>;
}

export function ShopProfile() {
  const resource = shopApi.useProfileQuery(undefined, { refetchOnMountOrArgChange: 90 });
  const [section, setSection] = useState<keyof typeof sectionLabels>("overview");
  const error = resource.error && shopQueryError(resource.error);
  const account = hidesPreviousData(error) ? undefined : resource.currentData?.account;
  const firstName = account?.name.trim().split(/\s+/)[0];
  return <main id="shop-content" className={`${styles.page} ${styles.profilePage}`}>
    <ShopPageHeader title={firstName ? `Ciao, ${firstName}` : "Account"} showAccountLink={false} />
    <ResourceFeedback busy={!account && resource.isFetching} error={error}
      reload={resource.refetch} />
    {account && <div className={styles.profileGrid}>
      <aside className={styles.profileSidebar}>
        <div className={styles.profileIdentity}>
          <span className={styles.avatar}>{account.name.split(/\s+/).filter(Boolean).slice(0, 2).map(word => word[0]).join("").toUpperCase()}<i /></span>
          <div><strong>{account.name}</strong><span>{account.email}</span></div>
        </div>
        <nav className={styles.profileNav} aria-label="Menu account">
          <button type="button" aria-pressed={section === "overview"} onClick={() => setSection("overview")}>
            <LayoutGrid size={18} strokeWidth={1.5} /><span>{sectionLabels.overview}</span>
          </button>
          <Link className={live.sidebarLink} href="/account/ordini"><Package size={18} strokeWidth={1.5} />I tuoi ordini <ArrowUpRight size={13} /></Link>
          <button type="button" aria-pressed={section === "profile"} onClick={() => setSection("profile")}>
            <Settings2 size={18} strokeWidth={1.5} /><span>{sectionLabels.profile}</span>
          </button>
          <button type="button" aria-pressed={section === "billing"} onClick={() => setSection("billing")}>
            <FileText size={18} strokeWidth={1.5} /><span>{sectionLabels.billing}</span>
          </button>
          <button type="button" aria-pressed={section === "support"} onClick={() => setSection("support")}>
            <MessageSquareWarning size={18} strokeWidth={1.5} /><span>{sectionLabels.support}</span>
          </button>
          <Link className={live.sidebarLink} href="/account/logout" prefetch={false}><LogOut size={17} strokeWidth={1.5} />Esci</Link>
        </nav>
      </aside>
      <section className={styles.profilePanel} aria-label={sectionLabels[section]}>
        {section === "overview" && <AccountOverview />}
        {section === "profile" && <><CustomerLinkStatus /><PersonalDetails key={account.id} account={account} /></>}
        {section === "billing" && <ShopBillingProfile key={account.id} account={account} />}
        {section === "support" && <ShopSupportTickets key={account.id} accountId={account.id} />}
      </section>
    </div>}
  </main>;
}
