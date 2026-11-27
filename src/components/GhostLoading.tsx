import { homepageGhostBody } from "./ghost-shape";
import styles from "./GhostLoading.module.css";

export function GhostLoading({ page = false, label = "Caricamento…" }: { page?: boolean; label?: string }) {
  return <div className={styles.loading} data-page={page} role="status">
    <span className={styles.runway} aria-hidden="true">
      {[0, 1, 2].map(index => <svg key={index} className={styles.ghost} viewBox="-10 -10 20 19" focusable="false">
        <path className={styles.body} d={homepageGhostBody} />
        <path d="M-6-2h4v5h-4zM2-2h4v5H2z" fill="#fcfdfb" />
        <path d="M-3 0h1v2h-1zM5 0h1v2H5z" fill="#171b19" />
      </svg>)}
    </span>
    <span>{label}</span>
  </div>;
}
