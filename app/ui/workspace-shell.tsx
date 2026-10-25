"use client";

import Image from "next/image";
import AnalyticsConsent from "@/app/ui/analytics-consent";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { signOut } from "@/app/actions";
import { useExperience } from "@/app/ui/theme-provider";
import { ExperienceSwitch, ThemeQuickSwitch } from "@/app/ui/theme-provider";
import { NavigationIcon, NavigationTrail, type NavigationIconName } from "@/app/ui/navigation-icon";
import { LanguageToggle } from "@/app/ui/language-provider";

const navigation: { href: string; label: string; icon: NavigationIconName; technical?: boolean }[] = [
  { href: "/overview", label: "Overview", icon: "overview" },
  { href: "/flow", label: "Market research", icon: "flow" },
  { href: "/markets", label: "Market map", icon: "markets" },
  { href: "/watchlist", label: "Watchlist", icon: "watchlist" },
  { href: "/strategies", label: "Strategy lab", icon: "strategies", technical: true },
  { href: "/nightwatch", label: "Nightwatch", icon: "nightwatch", technical: true },
  { href: "/futures", label: "Futures paper desk", icon: "futures", technical: true },
  { href: "/trading", label: "Bitget trading", icon: "trading", technical: true },
  { href: "/notifications", label: "Notifications", icon: "notifications" },
  { href: "/briefs", label: "Saved briefs", icon: "briefs", technical: true },
  { href: "/community", label: "Research community", icon: "community" },
  { href: "/guide", label: "Getting started", icon: "guide" },
  { href: "/demo", label: "Product walkthrough", icon: "demo", technical: true },
  { href: "/systems", label: "Research systems", icon: "systems", technical: true },
  { href: "/status", label: "System status", icon: "systems" },
  { href: "/judge", label: "Judge Mode", icon: "guide", technical: true },
  { href: "/settings", label: "Settings", icon: "settings" },
];
const mobilePrimaryNavigation = [
  { href: "/overview", label: "Overview", icon: "overview" as NavigationIconName },
  { href: "/flow", label: "Research", icon: "flow" as NavigationIconName },
  { href: "/markets", label: "Markets", icon: "markets" as NavigationIconName },
  { href: "/watchlist", label: "Watchlist", icon: "watchlist" as NavigationIconName },
];

export default function WorkspaceShell({ children, email, avatarUrl, displayName, isOperator }: { children: ReactNode; email: string | null; avatarUrl: string | null; displayName: string | null; isOperator: boolean }) {
  const pathname = usePathname();
  const router = useRouter();
  const { mode } = useExperience();
  const operatorNavigation = useMemo(() => isOperator ? [...navigation, { href: "/operator", label: "Operator console", icon: "settings" as NavigationIconName, technical: true }] : navigation, [isOperator]);
  const visibleNavigation = mode === "mini" ? operatorNavigation.filter((item) => !item.technical) : operatorNavigation;
  const profileLabel = displayName?.trim() || (email ? email.split("@")[0] : "Guest workspace");
  const profileInitial = profileLabel.slice(0, 1).toUpperCase() || "T";
  const [mobileMenuPath, setMobileMenuPath] = useState<string | null>(null);
  const mobileMenuOpen = mobileMenuPath === pathname;
  const active = operatorNavigation.find((item) => item.href === pathname) ?? navigation[0];

  useEffect(() => {
    if (mode !== "mini") return;
    const isTechnicalRoute = operatorNavigation.some((item) => item.technical && (pathname === item.href || pathname.startsWith(`${item.href}/`)));
    if (isTechnicalRoute) router.replace("/");
  }, [mode, pathname, router, operatorNavigation]);

  useEffect(() => {
    const closeNavigation = () => setMobileMenuPath(null);
    window.addEventListener("tidelight:close-navigation", closeNavigation);
    return () => window.removeEventListener("tidelight:close-navigation", closeNavigation);
  }, []);

  useEffect(() => { if (mobileMenuOpen) window.dispatchEvent(new Event("tidelight:close-guide")); }, [mobileMenuOpen]);

  if (pathname === "/status" || pathname.startsWith("/status/") || pathname === "/judge" || pathname === "/evidence" || pathname === "/replay" || pathname.startsWith("/replay/")) return <>{children}</>;
  if (pathname.startsWith("/login") || pathname.startsWith("/auth/") || pathname.startsWith("/developers") || pathname === "/") return <>{children}<AnalyticsConsent /></>;

  return (
    <div className="app-shell" data-experience={mode}>
      <aside className="sidebar" aria-label="Main navigation">
        <Link className="brand" href="/" aria-label="Tidelight home">
          <Image src="/tidelight-mark.svg" alt="" width={36} height={36} priority />
          <span>tide<span className="brand-light">light</span></span>
        </Link>
        <div className="workspace-label">YOUR WORKSPACE</div>
        <nav className="nav-list">
          {visibleNavigation.map((item) => {
            const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            return <Link data-technical={item.technical ? "true" : undefined} className={`nav-link${isActive ? " active" : ""}`} href={item.href} key={item.href} aria-current={isActive ? "page" : undefined}>
              <span className="nav-icon"><NavigationIcon name={item.icon} /></span>{item.label}<NavigationTrail />
            </Link>;
          })}
        </nav>
        <div className="sidebar-bottom">

          <div className="user-profile">
            <div className="avatar">{avatarUrl ? <Image src={avatarUrl} alt={profileLabel + " profile photo"} width={30} height={30} unoptimized /> : profileInitial}</div>
            <div className="user-profile-copy"><b>{profileLabel}</b><small>{email ?? "Sign in to save research"}</small></div>
            {email ? <form action={signOut}><button className="more" aria-label="Sign out" title="Sign out">↪</button></form> : <Link className="profile-link" href="/login">Sign in</Link>}
          </div>
        </div>
      </aside>
      <main className="main-area">
        <AnalyticsConsent />
        <header className="topbar">
          <Link className="mobile-brand" href="/"><Image src="/tidelight-mark.svg" alt="" width={36} height={36} priority /><span>tide<span className="brand-light">light</span></span></Link><LanguageToggle className="mobile-language-toggle" />
          <div className="breadcrumb">Workspace <span>/</span> {active.label}</div><div className="mobile-utility"><button type="button" className="mobile-menu-toggle" aria-label={mobileMenuOpen ? "Close workspace navigation" : "Open workspace navigation"} aria-expanded={mobileMenuOpen} aria-controls="mobile-workspace-drawer" onClick={() => setMobileMenuPath(mobileMenuOpen ? null : pathname)}><i/><i/><i/></button><b>{active.label}</b><div className="mobile-utility-controls"><ExperienceSwitch /><ThemeQuickSwitch /><Link className="top-signin" href={email ? "/account" : "/login"}>{email ? "ACCOUNT" : "SIGN IN"}</Link></div></div>
          <div className="top-actions"><ExperienceSwitch /><ThemeQuickSwitch /><Link className="top-signin" href={email ? "/account" : "/login"}>{email ? "ACCOUNT" : "SIGN IN"}</Link></div>
        </header>
        <div className="route-content">{children}</div>
        <footer className="page-footer"><span>© 2026 Tidelight Research</span><nav className="legal-footer-links" aria-label="Legal and account links"><Link href="/status">STATUS</Link><Link href="/judge">JUDGE MODE</Link><Link href="/terms">TERMS</Link><Link href="/privacy">PRIVACY</Link><Link href="/help">HELP</Link><Link href="/contact">CONTACT</Link><Link href="/account">ACCOUNT <span className="footer-dot">●</span></Link></nav></footer>
      </main>
      <nav className="mobile-nav" aria-label="Primary navigation">{mobilePrimaryNavigation.map((item) => { const isActive = pathname === item.href || (item.href !== "/overview" && pathname.startsWith(`${item.href}/`)); return <Link key={item.href} href={item.href} className={`mobile-nav-link${isActive ? " active" : ""}`} aria-current={isActive ? "page" : undefined}><span className="mobile-nav-icon"><NavigationIcon name={item.icon} /></span><span>{item.label}</span></Link>; })}<button type="button" className={`mobile-nav-link${mobileMenuOpen ? " active" : ""}`} aria-expanded={mobileMenuOpen} aria-controls="mobile-workspace-drawer" onClick={() => setMobileMenuPath(mobileMenuOpen ? null : pathname)}><span className="mobile-nav-icon"><NavigationIcon name="systems" /></span><span>More</span></button></nav>
      {mobileMenuOpen ? <div className="mobile-drawer-backdrop" onClick={() => setMobileMenuPath(null)}><aside className="mobile-workspace-drawer" id="mobile-workspace-drawer" aria-label="Workspace navigation" onClick={(event) => event.stopPropagation()}><div className="mobile-drawer-head"><span>YOUR WORKSPACE</span><button type="button" aria-label="Close menu" onClick={() => setMobileMenuPath(null)}>×</button></div><nav className="mobile-drawer-links">{visibleNavigation.map((item) => { const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href); return <Link key={item.href} data-technical={item.technical ? "true" : undefined} className={`mobile-drawer-link${isActive ? " active" : ""}`} href={item.href} onClick={() => setMobileMenuPath(null)} aria-current={isActive ? "page" : undefined}><span className="mobile-drawer-icon"><NavigationIcon name={item.icon} /></span>{item.label}<NavigationTrail /></Link>; })}</nav><div className="mobile-drawer-foot"><Link className="mobile-profile-link" href={email ? "/account" : "/login"} onClick={() => setMobileMenuPath(null)}><div className="mobile-profile-avatar">{avatarUrl ? <Image src={avatarUrl} alt={profileLabel + " profile photo"} width={30} height={30} unoptimized /> : <span>{profileInitial}</span>}</div><span><b>{email ? profileLabel : "Your Tidelight desk"}</b><small>{email ?? "Sign in to save your research"}</small></span></Link>{email ? <form action={signOut}><button className="mobile-signout" aria-label="Sign out" title="Sign out">↪</button></form> : <Link className="mobile-signin" href="/login">Sign in</Link>}</div></aside></div> : null}
    </div>
  );
}
