import Link from "next/link";
import Image from "next/image";
import { NavigationTrail } from "@/app/ui/navigation-icon";
import { ThemeQuickSwitch } from "@/app/ui/theme-provider";
import { LanguageToggle } from "@/app/ui/language-provider";
import { LandingUseCaseMenuLinks } from "@/app/ui/landing-use-case-menu-links";

export function LandingNavigation() {
  return <nav className="landing-nav" aria-label="Tidelight landing navigation">
    <Link className="landing-brand" href="/"><Image className="landing-mark" src="/tidelight-mark.svg" alt="" width={30} height={30} priority /><span>tide<span>light</span></span></Link>
    <div className="landing-nav-actions">
      <div className="landing-nav-links"><Link href="/use-cases">Use cases</Link><Link href="/#method">The method</Link><Link href="/#handbook">Docs <NavigationTrail className="landing-arrow" /></Link><Link href="/developers">Developers</Link><Link className="landing-nav-judge" href="/judge">Judge Mode</Link><Link href="/status">Status</Link><a className="landing-nav-field-notes" href="https://blogs.tidelight.app">Field Notes</a></div>
      <details className="landing-mobile-menu">
        <summary aria-label="Open site navigation"><span className="landing-menu-glyph" aria-hidden="true"><i /><i /><i /></span><span>Menu</span></summary>
        <div className="landing-mobile-menu-panel" aria-label="Site navigation">
          <LandingUseCaseMenuLinks />
          <Link href="/#method">The method <NavigationTrail className="landing-arrow" /></Link>
          <Link href="/#handbook">Handbook <NavigationTrail className="landing-arrow" /></Link>
          <Link href="/developers">Developers <NavigationTrail className="landing-arrow" /></Link>
          <Link className="landing-mobile-menu-judge" href="/judge">Judge Mode <NavigationTrail className="landing-arrow" /></Link>
          <Link href="/status">System status <NavigationTrail className="landing-arrow" /></Link>
          <Link className="landing-mobile-menu-notes" href="https://blogs.tidelight.app">Field Notes <NavigationTrail className="landing-arrow" /></Link>
        </div>
      </details>
      <ThemeQuickSwitch />
      <LanguageToggle className="landing-language-toggle" />
      <Link className="landing-nav-workspace" href="/overview">Open workspace</Link>
    </div>
  </nav>;
}
