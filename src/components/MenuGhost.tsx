import styles from "./MenuGhost.module.css";

export function MenuGhost() {
  return (
    <svg className={styles.ghost} width="20" height="18" viewBox="-10 -10 20 18" aria-hidden="true" focusable="false">
      <path className={styles.body} d="M-4-10H4V-8H6V-6H8V-4H10V8H6V6H3V8H-3V6H-6V8H-10V-4H-8V-6H-6V-8H-4Z" />
      <rect x="-6" y="-2" width="4" height="5" fill="#FCFDFB" />
      <rect x="2" y="-2" width="4" height="5" fill="#FCFDFB" />
      <rect x="-4" y="0" width="2" height="2" fill="#15221A" />
      <rect x="4" y="0" width="2" height="2" fill="#15221A" />
    </svg>
  );
}
