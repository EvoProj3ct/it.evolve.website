"use client";

import { useRef, useState, type FormEvent } from "react";
import { ArrowRight } from "lucide-react";
import { savedBillingSchema, type Account, type BillingProfile } from "@/lib/ecommerce/contracts";
import { errorText, storefrontMutate } from "@/lib/ecommerce/browser";
import { announceShopPreference, cacheShopEntries, shopApi, shopQueryError, useShopStore } from "@/lib/ecommerce/shop-store";
import { BillingFields, readBillingFields } from "./ShopBillingFields";
import { ResourceFeedback } from "./ShopPreviewShared";
import common from "./CommercePreview.module.css";
import styles from "./Storefront.module.css";

export function ShopBillingProfile({ account }: { account: Account }) {
  const resource = shopApi.useBillingQuery(undefined, { refetchOnMountOrArgChange: 90 });
  return <>
    <div className={common.panelHeading}><h2>Fatturazione<span>.</span></h2></div>
    <p className={styles.help}>Salva i tuoi dati per ritrovarli già compilati quando acquisti.</p>
    <ResourceFeedback busy={resource.isLoading} error={resource.error && shopQueryError(resource.error)} reload={resource.refetch} />
    {resource.currentData && !resource.error && <BillingForm key={account.id} account={account} billing={resource.currentData.billing} />}
  </>;
}

function BillingForm({ account, billing }: { account: Account; billing: BillingProfile | null }) {
  const store = useShopStore();
  const [country, setCountry] = useState(billing?.address.country ?? "IT");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const lock = useRef(false);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (lock.current) return;
    const billing = readBillingFields(new FormData(event.currentTarget));
    lock.current = true;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const saved = await storefrontMutate("/me/billing", "PUT", { billing }, savedBillingSchema);
      await cacheShopEntries(store, [{ endpointName: "billing", arg: undefined, value: saved }]);
      announceShopPreference("Billing");
      setMessage("Dati di fatturazione salvati.");
    } catch (reason) {
      setError(errorText(reason));
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }

  return <form method="post" className={styles.checkoutForm} onSubmit={save}>
    <fieldset disabled={busy}>
      <BillingFields account={account} billing={billing} country={country} onCountry={setCountry} />
    </fieldset>
    {error && <p className={styles.error} role="alert">{error}</p>}
    {message && <p className={styles.success} role="status">{message}</p>}
    <button type="submit" className={styles.primary} disabled={busy}>
      {busy ? "Salvataggio…" : "Salva dati di fatturazione"}<ArrowRight size={17} />
    </button>
  </form>;
}
