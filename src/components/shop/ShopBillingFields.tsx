import type { Account, Address, BillingProfile } from "@/lib/ecommerce/contracts";
import styles from "./Storefront.module.css";

const addressFields = [
  { key: "name", label: "Destinatario", maxLength: 200, autoComplete: "name", required: true },
  { key: "line1", label: "Via e numero civico", maxLength: 200, autoComplete: "address-line1", required: true, wide: true },
  { key: "line2", label: "Seconda riga, facoltativa", maxLength: 200, autoComplete: "address-line2", wide: true },
  { key: "city", label: "Città", maxLength: 100, autoComplete: "address-level2", required: true },
  { key: "postalCode", label: "CAP", maxLength: 20, autoComplete: "postal-code", required: true },
  { key: "region", label: "Provincia o regione, facoltativa", maxLength: 100, autoComplete: "address-level1" },
] as const;

type AddressProps = {
  prefix: "billing" | "shipping";
  name: string;
  value?: Address;
  countries?: readonly string[];
  country: string;
  onCountry: (value: string) => void;
};

export function AddressFields({ prefix, name, value, countries, country, onCountry }: AddressProps) {
  return <div className={styles.fieldGrid}>
    {addressFields.map(field => <label key={field.key} className={"wide" in field ? styles.wideField : undefined}>
      {field.label}
      <input
        name={`${prefix}-${field.key}`}
        defaultValue={value?.[field.key] ?? (field.key === "name" ? name : undefined)}
        required={"required" in field}
        maxLength={field.maxLength}
        autoComplete={`${prefix} ${field.autoComplete}`}
      />
    </label>)}
    <label>{countries ? "Paese" : "Paese (codice a due lettere)"}
      {countries ? <select name={`${prefix}-country`} required value={country} onChange={event => onCountry(event.target.value)}
        autoComplete={`${prefix} country`}>
        <option value="">Scegli un Paese</option>
        {countries.map(code => <option key={code} value={code}>{code}</option>)}
      </select> : <input name={`${prefix}-country`} required value={country} onChange={event => onCountry(event.target.value.toUpperCase())}
        autoComplete={`${prefix} country`} maxLength={2} pattern="[A-Z]{2}" placeholder="IT" />}
    </label>
  </div>;
}

export function BillingFields({ account, billing, countries, country, onCountry, requireTaxCode, requireVat }: {
  account: Account;
  billing?: BillingProfile | null;
  countries?: readonly string[];
  country: string;
  onCountry: (value: string) => void;
  requireTaxCode?: boolean;
  requireVat?: boolean;
}) {
  const company = account.kind === "company";
  return <>
    <p className={styles.help}>{account.email} · Account {company ? "azienda" : "privato"}</p>
    <div className={styles.fieldGrid}>
      <label className={styles.wideField}>{company ? "Ragione sociale" : "Nome e cognome"}
        <input name="billingName" defaultValue={billing?.name ?? account.name} required maxLength={200} autoComplete={company ? "organization" : "billing name"} />
      </label>
      {company && <label>Partita IVA{!requireVat && ", facoltativa"}
        <input name="vatNumber" defaultValue={billing?.vatNumber} required={requireVat} maxLength={40} />
      </label>}
      <label>Codice fiscale{!requireTaxCode && ", facoltativo"}
        <input name="taxCode" defaultValue={billing?.taxCode} required={requireTaxCode} maxLength={40} />
      </label>
      {company && <>
        <label>Codice destinatario, facoltativo<input name="recipientCode" defaultValue={billing?.recipientCode} maxLength={20} /></label>
        <label>PEC, facoltativa<input name="certifiedEmail" defaultValue={billing?.certifiedEmail} type="email" maxLength={254} /></label>
      </>}
    </div>
    <AddressFields prefix="billing" name={billing?.name ?? account.name} value={billing?.address}
      countries={countries} country={country} onCountry={onCountry} />
  </>;
}

const fieldValue = (form: FormData, name: string) => String(form.get(name) ?? "").trim();

export function readAddressFields(form: FormData, prefix: "billing" | "shipping"): Address {
  const value = (name: string) => fieldValue(form, `${prefix}-${name}`);
  const line2 = value("line2"), region = value("region");
  return {
    name: value("name"),
    line1: value("line1"),
    city: value("city"),
    postalCode: value("postalCode"),
    country: value("country"),
    ...(line2 && { line2 }),
    ...(region && { region }),
  };
}

export function readBillingFields(form: FormData): BillingProfile {
  const billing: BillingProfile = { name: fieldValue(form, "billingName"), address: readAddressFields(form, "billing") };
  for (const key of ["taxCode", "vatNumber", "recipientCode", "certifiedEmail"] as const) {
    const value = fieldValue(form, key);
    if (value) billing[key] = value;
  }
  return billing;
}
