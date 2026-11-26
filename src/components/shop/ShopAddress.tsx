import type { Address, Quote } from "@/lib/ecommerce/contracts";

export function AddressText({ address }: { address: Address }) {
  return <>{address.name}<br />{address.line1}{address.line2 && <><br />{address.line2}</>}<br />{address.postalCode} {address.city}{address.region && <> · {address.region}</>}<br />{address.country}</>;
}
export function BillingText({ billing }: { billing: Quote["billing"] }) {
  return <>{billing.name}<br />{billing.email}<br /><AddressText address={billing.address} />{billing.taxCode && <><br />CF {billing.taxCode}</>}{billing.vatNumber && <><br />P.IVA {billing.vatNumber}</>}{billing.recipientCode && <><br />Codice destinatario {billing.recipientCode}</>}{billing.certifiedEmail && <><br />PEC {billing.certifiedEmail}</>}</>;
}
