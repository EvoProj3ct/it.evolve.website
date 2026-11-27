import { homepageGhostBody } from "@/components/ghost-shape";
import styles from "./Storefront.module.css";

export type OrderGhostKind = "blocked" | "payable" | "waiting" | "confirmed" | "progress" | "pickup" | "shipping" | "service_pending" | "received" | "closed";
const colors: Record<OrderGhostKind, string> = {
  blocked: "#c4645e", payable: "#c78731", waiting: "#927ab9", confirmed: "#547fbf",
  progress: "#539a84", pickup: "#8b7856", shipping: "#457fb9", service_pending: "#569d55", received: "#72c94f", closed: "#87938c",
};

export function OrderStatusGhost({ kind }: { kind: OrderGhostKind }) {
  return <svg aria-hidden="true" focusable="false" viewBox="-17 -18 34 33" className={styles.orderStatusGhost}>
    <path d={homepageGhostBody} fill={colors[kind]} />
    <path d="M-6-2h4v5h-4zM2-2h4v5H2z" fill="#fcfdfb" />
    <path d="M-4 0h2v2h-2zM4 0h2v2H4z" fill="#182a23" />
    {kind === "progress" && <>
      <path d="M-8-8v-4h2v-3h3v-2h6v2h3v3h2v4Z" fill="#f6cb55" />
      <path d="M-10-9h20v3h-20z" fill="#d9912d" />
      <path d="M-2-16h2v7h-2z" fill="#fff1aa" />
    </>}
    {kind === "shipping" && <>
      <path d="M-9-9v-4l3-2h12l3 2v4z" fill="#214b76" />
      <path d="M-10-10h20v3h-20z" fill="#122f50" />
      <path d="M-3-13h6v2h-6z" fill="#fbd777" />
      <rect x="4" y="4" width="11" height="8" rx="1" fill="#fcf5dc" stroke="#214b76" />
      <path d="m5 5 4.5 3L14 5" fill="none" stroke="#214b76" />
    </>}
    {(kind === "received" || kind === "confirmed" || kind === "service_pending") && <>
      <circle cx="9" cy="8" r="5.5" fill="#327243" stroke="#f5fff3" strokeWidth=".7" />
      <path d="m6.5 8 1.5 1.5 3-3" fill="none" stroke="#fff" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    </>}
    {kind === "pickup" && <>
      <rect x="3.5" y="2" width="12" height="10" rx="1.2" fill="#f1cf89" stroke="#654b31" />
      <path d="M4 5.5h11M8 2v3.5h3V2M11.5 9h2" fill="none" stroke="#795633" strokeWidth="1" />
    </>}
    {(kind === "payable" || kind === "waiting") && <>
      <circle cx="9" cy="8" r="5.3" fill={kind === "payable" ? "#805720" : "#614c89"} />
      {kind === "payable"
        ? <path d="M11 5.5C7 3.8 6 12 11 10.4M6 7.4h4M6 8.7h3.4" fill="none" stroke="#fff" strokeWidth=".8" strokeLinecap="round" />
        : <path d="M9 5.5v2.7l1.6 1.2" fill="none" stroke="#fff" strokeWidth="1.1" strokeLinecap="round" />}
    </>}
    {kind === "blocked" && <>
      <circle cx="9" cy="8" r="5" fill="#873f3b" />
      <path d="M6.5 8h5" stroke="#fff" strokeWidth="1.3" strokeLinecap="round" />
    </>}
  </svg>;
}
