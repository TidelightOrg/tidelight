import Link from "next/link";
import styles from "./use-cases-signal-link.module.css";

const signals = ["EVENT", "EVIDENCE", "EXPOSURE", "DECISION"];

export default function UseCasesSignalLink() {
  return <section className={styles.section} aria-labelledby="use-cases-invitation-title">
    <Link className={styles.card} href="/use-cases">
      <span className={styles.eyebrow}><i /> RESEARCH PATHS / 08 STARTING POINTS</span>
      <span className={styles.copy}><strong id="use-cases-invitation-title">A clearer way into the market.</strong><span>Find a research path built around the question you have.</span></span>
      <span className={styles.art} aria-hidden="true">
        <span className={styles.orbit} /><span className={`${styles.orbit} ${styles.orbitTwo}`} />
        <span className={styles.core}><b>tide</b><i>light</i><small>QUESTION / SIGNAL</small></span>
        {signals.map((signal, index) => <span className={`${styles.node} ${styles[`node${index + 1}`]}`} key={signal}><i />{signal}</span>)}
        <span className={styles.trace} />
      </span>
      <span className={styles.action}>Explore use cases <b aria-hidden="true">↗</b></span>
    </Link>
  </section>;
}
