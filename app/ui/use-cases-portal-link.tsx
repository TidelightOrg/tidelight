import Link from "next/link";
import styles from "./use-cases-portal-link.module.css";

export function UseCasesPortalLink() {
  return <Link className={styles.link} href="/use-cases" aria-label="Explore Tidelight use cases">
    <span className={styles.art} aria-hidden="true">
      <svg viewBox="0 0 620 110" preserveAspectRatio="none">
        <path className={styles.track} d="M2 64C85 64 83 26 164 26s82 58 164 58 82-46 164-46 76 28 126 28" />
        <path className={styles.trace} d="M2 64C85 64 83 26 164 26s82 58 164 58 82-46 164-46 76 28 126 28" />
      </svg>
      <i className={`${styles.beacon} ${styles.beaconOne}`} /><i className={`${styles.beacon} ${styles.beaconTwo}`} /><i className={`${styles.beacon} ${styles.beaconThree}`} />
      <span className={styles.orbit}>↗</span>
      <span className={styles.index}>01 — 08</span>
    </span>
    <span className={styles.copy}><span>FOLLOW A QUESTION</span><strong>Use cases</strong><small>Eight clear paths into the research desk</small></span>
    <span className={styles.action}>Explore the paths <b aria-hidden="true">↗</b></span>
  </Link>;
}
