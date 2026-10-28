"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { signOut } from "@/app/actions";
import { useExperience } from "@/app/ui/theme-provider";
import { ExperienceSwitch, ThemeQuickSwitch } from "@/app/ui/theme-provider";
import { NavigationIcon, NavigationTrail, type NavigationIconName } from "@/app/ui/navigation-icon";
import { LanguageToggle } from "@/app/ui/language-provider";

const navigationGroups: { label: string; items: { href: string; label: string; icon: NavigationIconName; technical?: boolean; operatorOnly?: boolean }[] }[] = [
  { label: "Research", items: [
    { href: "/overview", label: "Overview", icon: "overview" },
    { href: "/flow", label: "Market research", icon: "flow" },
    { href: "/monitor", label: "Research Monitor", icon: "monitor" },
    { href: "/markets", label: "Market map", icon: "markets" },
    { href: "/watchlist", label: "Watchlist", icon: "watchlist" },
    { href: "/briefs", label: "Saved briefs", icon: "briefs", technical: true },
  ] },
  { label: "Tools", items: [
    { href: "/strategies", label: "Strategy lab", icon: "strategies", technical: true },
    { href: "/nightwatch", label: "Nightwatch", icon: "nightwatch", technical: true },
    { href: "/futures", label: "Futures paper desk", icon: "futures", technical: true },
    { href: "/trading", label: "Bitget trading", icon: "trading", technical: true },
    { href: "/notifications", label: "Notifications", icon: "notifications" },
    { href: "/systems", label: "Research systems", icon: "systems", technical: true },
  ] },
  { label: "Community", items: [{ href: "/community", label: "Research community", icon: "community" }] },
  { label: "Workspace", items: [
    { href: "/settings", label: "Settings", icon: "settings" },
    { href: "/operator", label: "Operator console", icon: "settings", technical: true, operatorOnly: true },
  ] },
  { label: "Learn", items: [
    { href: "/guide", label: "Getting started", icon: "guide" },
    { href: "/demo", label: "Product walkthrough", icon: "demo", technical: true },
    { href: "/status", label: "System status", icon: "systems" },
  ] },
];
const resourceLinks = [{ href: "/help", label: "Help", glyph: "?" }, { href: "/developers", label: "Documentation", glyph: "</>" }];
const miniModeBlockedRoutes = ["/strategies", "/nightwatch", "/futures", "/trading", "/briefs", "/demo", "/systems", "/judge"];
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
  const visibleGroups = useMemo(() => navigationGroups.map((group) => ({ ...group, items: group.items.filter((item) => (!item.technical || mode !== "mini") && (!item.operatorOnly || isOperator)) })).filter((group) => group.items.length), [isOperator, mode]);
  const visibleNavigation = useMemo(() => visibleGroups.flatMap((group) => group.items), [visibleGroups]);
  const profileLabel = displayName?.trim() || (email ? email.split("@")[0] : "Guest workspace");
  const profileInitial = profileLabel.slice(0, 1).toUpperCase() || "T";
  const [mobileMenuPath, setMobileMenuPath] = useState<string | null>(null);
  const mobileMenuOpen = mobileMenuPath === pathname;
  const active = visibleNavigation.find((item) => item.href === pathname) ?? visibleNavigation[0];

  useEffect(() => {
    if (mode !== "mini") return;
    const isTechnicalRoute = miniModeBlockedRoutes.some((route) => pathname === route || pathname.startsWith(`${route}/`));
    if (isTechnicalRoute) router.replace("/");
  }, [mode, pathname, router]);

  useEffect(() => {
    const closeNavigation = () => setMobileMenuPath(null);
    window.addEventListener("tidelight:close-navigation", closeNavigation);
    return () => window.removeEventListener("tidelight:close-navigation", closeNavigation);
  }, []);

  useEffect(() => { if (mobileMenuOpen) window.dispatchEvent(new Event("tidelight:close-guide")); }, [mobileMenuOpen]);

  if (pathname === "/status" || pathname.startsWith("/status/") || pathname === "/judge" || pathname === "/evidence" || pathname === "/replay" || pathname.startsWith("/replay/")) return <>{children}</>;
  if (pathname.startsWith("/login") || pathname.startsWith("/auth/") || pathname.startsWith("/developers") || pathname === "/" || pathname === "/use-cases") return <>{children}</>;

  return (
    <div className="app-shell" data-experience={mode}>
      <aside className="sidebar" aria-label="Main navigation">
        <Link className="brand" href="/" prefetch={false} aria-label="Tidelight home">
          <Image src="/tidelight-mark.svg" alt="" width={36} height={36} priority />
          <span>tide<span className="brand-light">light</span></span>
        </Link>
        <div className="workspace-label">YOUR WORKSPACE</div>
        <nav className="nav-list">
          {visibleGroups.map((group) => <div className="nav-group" key={group.label}>
            <div className="nav-group-label">{group.label}</div>
            <div className="nav-group-links">{group.items.map((item) => {
              const isActive = pathname === item.href || (item.href !== "/overview" && pathname.startsWith(`${item.href}/`));
              return <Link data-technical={item.technical ? "true" : undefined} className={`nav-link${isActive ? " active" : ""}`} href={item.href} prefetch={false} key={item.href} aria-current={isActive ? "page" : undefined}>
                <span className="nav-icon"><NavigationIcon name={item.icon} /></span>{item.label}<NavigationTrail />
              </Link>;
            })}</div>
          </div>)}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-resources">{resourceLinks.map((item) => <Link href={item.href} key={item.href} prefetch={false}><span>{item.glyph}</span>{item.label}</Link>)}</div>
          <div className="user-profile">
            <div className="avatar">{avatarUrl ? <Image src={avatarUrl} alt={profileLabel + " profile photo"} width={30} height={30} unoptimized /> : profileInitial}</div>
            <div className="user-profile-copy"><b>{profileLabel}</b><small>{email ?? "Sign in to save research"}</small></div>
            {email ? <form action={signOut}><button className="more" aria-label="Sign out" title="Sign out">↪</button></form> : <Link className="profile-link" href="/login" prefetch={false}>Sign in</Link>}
          </div>
        </div>
      </aside>
      <main className="main-area">
        <header className="topbar">
          <Link className="mobile-brand" href="/"><Image src="/tidelight-mark.svg" alt="" width={36} height={36} priority /><span>tide<span className="brand-light">light</span></span></Link><LanguageToggle className="mobile-language-toggle" />
          <div className="breadcrumb">Workspace <span>/</span> {active.label}</div><div className="mobile-utility"><button type="button" className="mobile-menu-toggle" aria-label={mobileMenuOpen ? "Close workspace navigation" : "Open workspace navigation"} aria-expanded={mobileMenuOpen} aria-controls="mobile-workspace-drawer" onClick={() => setMobileMenuPath(mobileMenuOpen ? null : pathname)}><i/><i/><i/></button><b>{active.label}</b><div className="mobile-utility-controls"><ExperienceSwitch /><ThemeQuickSwitch /><Link className="top-signin" href={email ? "/account" : "/login"} prefetch={false}>{email ? "ACCOUNT" : "SIGN IN"}</Link></div></div>
          <div className="top-actions"><ExperienceSwitch /><ThemeQuickSwitch /><Link className="top-signin" href={email ? "/account" : "/login"} prefetch={false}>{email ? "ACCOUNT" : "SIGN IN"}</Link></div>
        </header>
        <div className="route-content">{children}</div>
        <footer className="page-footer"><span>© 2026 Tidelight Research</span><nav className="legal-footer-links" aria-label="Legal and account links"><Link href="/status" prefetch={false}>STATUS</Link><Link href="/judge" prefetch={false}>JUDGE MODE</Link><Link href="/terms" prefetch={false}>TERMS</Link><Link href="/privacy" prefetch={false}>PRIVACY</Link><Link href="/help" prefetch={false}>HELP</Link><Link href="/contact" prefetch={false}>CONTACT</Link><Link href="/account" prefetch={false}>ACCOUNT <span className="footer-dot">●</span></Link></nav></footer>
      </main>
      <nav className="mobile-nav" aria-label="Primary navigation">{mobilePrimaryNavigation.map((item) => { const isActive = pathname === item.href || (item.href !== "/overview" && pathname.startsWith(`${item.href}/`)); return <Link key={item.href} href={item.href} prefetch={false} className={`mobile-nav-link${isActive ? " active" : ""}`} aria-current={isActive ? "page" : undefined}><span className="mobile-nav-icon"><NavigationIcon name={item.icon} /></span><span>{item.label}</span></Link>; })}<button type="button" className={`mobile-nav-link${mobileMenuOpen ? " active" : ""}`} aria-expanded={mobileMenuOpen} aria-controls="mobile-workspace-drawer" onClick={() => setMobileMenuPath(mobileMenuOpen ? null : pathname)}><span className="mobile-nav-icon"><NavigationIcon name="systems" /></span><span>More</span></button></nav>
      {mobileMenuOpen ? <div className="mobile-drawer-backdrop" onClick={() => setMobileMenuPath(null)}><aside className="mobile-workspace-drawer" id="mobile-workspace-drawer" aria-label="Workspace navigation" onClick={(event) => event.stopPropagation()}><div className="mobile-drawer-head"><Link className="mobile-drawer-brand" href="/" aria-label="Tidelight home"><Image src="/tidelight-mark.svg" alt="" width={29} height={29} priority /><span>tide<span>light</span></span></Link><button type="button" aria-label="Close menu" onClick={() => setMobileMenuPath(null)}>×</button></div><nav className="mobile-drawer-links" aria-label="Workspace sections">{visibleGroups.map((group) => <div className="mobile-nav-group" key={group.label}><div className="mobile-nav-group-label">{group.label}</div>{group.items.map((item) => { const isActive = pathname === item.href || (item.href !== "/overview" && pathname.startsWith(`${item.href}/`)); return <Link key={item.href} data-technical={item.technical ? "true" : undefined} className={`mobile-drawer-link${isActive ? " active" : ""}`} href={item.href} prefetch={false} onClick={() => setMobileMenuPath(null)} aria-current={isActive ? "page" : undefined}><span className="mobile-drawer-icon"><NavigationIcon name={item.icon} /></span>{item.label}<NavigationTrail /></Link>; })}</div>)}</nav><div className="mobile-drawer-extras"><div className="mobile-plan-card"><span>{email ? "Tidelight workspace" : "Your research workspace"}</span><Link href={email ? "/account" : "/login"} onClick={() => setMobileMenuPath(null)}>{email ? "Manage account ↗" : "Sign in to save research ↗"}</Link></div><div className="mobile-resource-links">{resourceLinks.map((item) => <Link href={item.href} key={item.href} prefetch={false} onClick={() => setMobileMenuPath(null)}><span>{item.glyph}</span>{item.label}</Link>)}</div></div><div className="mobile-drawer-foot"><Link className="mobile-profile-link" href={email ? "/account" : "/login"} prefetch={false} onClick={() => setMobileMenuPath(null)}><div className="mobile-profile-avatar">{avatarUrl ? <Image src={avatarUrl} alt={profileLabel + " profile photo"} width={30} height={30} unoptimized /> : <span>{profileInitial}</span>}</div><span><b>{email ? profileLabel : "Your Tidelight desk"}</b><small>{email ?? "Sign in to save your research"}</small></span></Link>{email ? <form action={signOut}><button className="mobile-signout" aria-label="Sign out" title="Sign out">↪</button></form> : <Link className="mobile-signin" href="/login" prefetch={false}>Sign in</Link>}</div></aside></div> : null}
    </div>
  );
}
