import { Plus } from "lucide-react";
import { shopPaymentFaq } from "./shopPaymentFaq";
import styles from "./Shop.module.css";

const cartFaq = [
  ...shopPaymentFaq,
  {
    question: "Come funziona la spedizione?",
    answer: "Spediamo in Italia con un servizio tracciato. Quando il pacco parte, ti inviamo il codice di tracciamento via email.",
  },
];

export function ShopCartFaq() {
  return (
    <section className={`${styles.faq} ${styles.cartFaq}`} aria-label="Domande frequenti su pagamenti e spedizione">
      {cartFaq.map(({ question, answer }) => (
        <details key={question}>
          <summary>{question}<Plus size={18} aria-hidden="true" /></summary>
          <div className={styles.faqAnswer}><p>{answer}</p></div>
        </details>
      ))}
    </section>
  );
}
