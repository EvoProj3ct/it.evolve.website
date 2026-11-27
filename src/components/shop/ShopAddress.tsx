import { MapPin, ReceiptText } from "lucide-react";
import type { Address, Quote } from "@/lib/ecommerce/contracts";
import styles from "./Storefront.module.css";

const countries = new Intl.DisplayNames("it-IT", { type: "region" });

function AddressLines({ address }: { address: Address }) {
  return <>
    <span>{address.line1}</span>
    {address.line2 && <span>{address.line2}</span>}
    <span>{[address.postalCode, address.city].join(" ")}{address.region && ` · ${address.region}`}</span>
    <small>{countries.of(address.country) ?? address.country}</small>
  </>;
}

export function OrderAddresses({ billing, shipping }: { billing: Quote["billing"]; shipping?: Address }) {
  const fiscalFields = [
    ["Codice fiscale", billing.taxCode],
    ["Partita IVA", billing.vatNumber],
    ["Codice destinatario", billing.recipientCode],
    ["PEC", billing.certifiedEmail],
  ] as const;
  return <div className={styles.addresses}>
    <section className={styles.addressCard}>
      <h3><ReceiptText size={19} aria-hidden="true" /> Fatturazione</h3>
      <dl>
        <div><dt>{billing.kind === "company" ? "Ragione sociale" : "Intestatario"}</dt><dd>{billing.name}</dd></div>
        <div><dt>Email</dt><dd>{billing.email}</dd></div>
        <div className={styles.addressWide}><dt>Indirizzo di fatturazione</dt><dd className={styles.addressLines}>
          {billing.address.name !== billing.name && <span>{billing.address.name}</span>}
          <AddressLines address={billing.address} />
        </dd></div>
        {fiscalFields.map(([label, value]) => value && <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
      </dl>
    </section>
    {shipping && <section className={styles.addressCard}>
      <h3><MapPin size={19} aria-hidden="true" /> Spedizione</h3>
      <dl>
        <div className={styles.addressWide}><dt>Destinatario</dt><dd>{shipping.name}</dd></div>
        <div className={styles.addressWide}><dt>Indirizzo di consegna</dt><dd className={styles.addressLines}><AddressLines address={shipping} /></dd></div>
      </dl>
    </section>}
  </div>;
}
