import Image from "next/image";
import Link from "next/link";
import styles from "./tidelight-signature-footer.module.css";

type Surface = "research" | "intelligence" | "packages";

const destinations = {
  research: { label: "Research desk", href: "https://tidelight.app/" },
  intelligence: { label: "Intelligence Cloud", href: "https://tidelight.app/developers" },
  packages: { label: "Package directory", href: "https://package.tidelight.app/" },
};

export function TidelightSignatureFooter({ surface }: { surface: Surface }) {
  return <footer className={styles.footer}>
    <div className={styles.top}>
      <div className={styles.brandPanel}>
        <Link className={styles.brand} href={destinations[surface].href} aria-label={`Tidelight ${destinations[surface].label}`}>
          <Image src="/tidelight-mark.svg" alt="" width={34} height={34} />
          <span><b>tide<span>light</span></b><small>{destinations[surface].label}</small></span>
        </Link>
        <p>Clarity when the bell is quiet.</p>
        <span className={styles.signature}><i/> SOURCE · SIGNAL · CONTEXT</span>
      </div>
      <div className={styles.signal} aria-hidden="true">
        <svg viewBox="0 0 520 210" fill="none">
          <path d="M14 119c44 0 44-37 88-37s44 73 88 73 44-98 88-98 44 53 88 53 44-29 88-29 44 38 52 38"/>
          <path d="M14 139c44 0 44-25 88-25s44 51 88 51 44-70 88-70 44 38 88 38 44-20 88-20 44 26 52 26"/>
          <path d="M14 159c44 0 44-13 88-13s44 29 88 29 44-42 88-42 44 23 88 23 44-11 88-11 44 14 52 14"/>
          <circle cx="102" cy="82" r="4"/><circle cx="278" cy="57" r="4"/><circle cx="454" cy="81" r="4"/>
        </svg>
        <span>EVERY SIGNAL HAS A SOURCE</span>
      </div>
    </div>
    <div className={styles.directory}>
      <section><h2>Research</h2><Link href="https://tidelight.app/research">Research desk</Link><Link href="https://tidelight.app/markets">Market map</Link><Link href="https://tidelight.app/strategies">Strategy lab</Link><Link href="https://tidelight.app/nightwatch">Nightwatch</Link></section>
      <section><h2>Build</h2><Link href="https://tidelight.app/developers">Developer platform</Link><Link href="https://dev.tidelight.app/">Documentation</Link><Link href="https://tidelight.app/developers/console">API explorer</Link><Link href="https://package.tidelight.app/">Packages</Link><Link href="https://tidelight.app/developers/integrations">Integrations</Link></section>
      <section><h2>Trust & updates</h2><Link href="https://tidelight.app/judge">Judge Mode</Link><Link href="https://status.tidelight.app/">System status</Link><Link href="https://blogs.tidelight.app/">Field Notes</Link><Link href="https://tidelight.app/terms">Terms</Link><Link href="https://tidelight.app/privacy">Privacy</Link></section>
    </div>
    <div className={styles.bottom}><span>© 2026 Tidelight Research</span><span>Evidence first. Decisions stay yours.</span><a href="mailto:support@tidelight.app">Contact Tidelight <span aria-hidden="true">↗</span></a></div>
  </footer>;
}
