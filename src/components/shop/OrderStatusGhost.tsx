import { homepageGhostBody } from "@/components/ghost-shape";
import styles from "./Storefront.module.css";

export type OrderGhostKind = "blocked" | "payable" | "waiting" | "fulfillment" | "progress" | "shipping" | "received" | "closed";
const colors: Record<OrderGhostKind, string> = {
  blocked: "#c4645e", payable: "#c78731", waiting: "#927ab9", fulfillment: "#6d9ac8",
  progress: "#539a84", shipping: "#457fb9", received: "#72c94f", closed: "#87938c",
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
    {kind === "received" && <>
      <circle cx="9" cy="8" r="5.5" fill="#2d6036" />
      <path d="m6.5 8 1.5 1.5 3-3" fill="none" stroke="#fff" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    </>}
    {kind === "blocked" && <>
      <circle cx="9" cy="8" r="5" fill="#873f3b" />
      <path d="M6.5 8h5" stroke="#fff" strokeWidth="1.3" strokeLinecap="round" />
    </>}
  </svg>;
}
