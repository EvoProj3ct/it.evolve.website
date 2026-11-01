import { COOKIE_CATEGORIES } from "@/lib/legal/cookie-consent";
import styles from "./cookie-consent.module.css";

export function CookieCategories({ detailed = false }: { detailed?: boolean }) {
  const prefix = detailed ? "cookie-details" : "cookie-banner";

  return (
    <fieldset className={`${styles.categories} ${detailed ? styles.detailedCategories : ""}`}>
      <legend className={styles.srOnly}>Categorie di cookie utilizzate sul sito</legend>
      {COOKIE_CATEGORIES.map((category) => (
        <label key={category.id} className={styles.category}>
          <span className={styles.categoryText}>
            <span className={styles.categoryLabel}>{category.label}</span>
            <span className={styles.categoryStatus}>{category.status}</span>
            {detailed && <span id={`${prefix}-${category.id}`} className={styles.categoryDescription}>{category.description}</span>}
          </span>
          <span className={styles.switch}>
            <input
              type="checkbox"
              checked={category.active}
              disabled
              readOnly
              aria-label={`${category.label}: ${category.status.toLowerCase()}`}
              aria-describedby={detailed ? `${prefix}-${category.id}` : undefined}
            />
            <span className={styles.switchTrack} aria-hidden="true"><span /></span>
          </span>
        </label>
      ))}
    </fieldset>
  );
}
