"use client";

import { useEffect, useId, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ThemeQuickSwitch } from "@/app/ui/theme-provider";
import { EcosystemSwitcher } from "./ecosystem-switcher";

type PlatformNavProps = {
  active?: "platform" | "packages" | "support";
  ecosystem?: "tidelight" | "intelligence" | "packages";
};

export function DeveloperMobileDock({ current = "platform" }: { current?: "platform" | "console" | "packages" | "support" | "docs" }) {
  const items = [
    { id: "platform", label: "Cloud", href: "https://tidelight.app/developers", icon: "M3 10.5 12 3l9 7.5M5 9v11h14V9M9 20v-6h6v6" },
    { id: "console", label: "Console", href: "https://tidelight.app/developers/console", icon: "M4 5h16v14H4zM8 9l3 3-3 3M13 15h3" },
    { id: "packages", label: "Packages", href: "https://package.tidelight.app/dashboard", icon: "M12 3 21 8v8l-9 5-9-5V8zM3 8l9 5 9-5M12 13v8" },
    { id: "tidelight", label: "Tidelight", href: "https://tidelight.app/", icon: "M12 3a9 9 0 1 0 9 9M12 7a5 5 0 1 0 5 5" },
    { id: "support", label: "Support", href: `https://tidelight.app/developers/support?ecosystem=${current === "packages" ? "packages" : "intelligence"}`, icon: "M4 5h16v12H9l-5 4zM8 9h8M8 13h5" },
  ] as const;
  return <nav className="tic-mobile-system-dock" aria-label="Developer systems">{items.map(item => <Link key={item.id} href={item.href} aria-current={current === item.id ? "page" : undefined}><svg viewBox="0 0 24 24" aria-hidden="true"><path d={item.icon} /></svg><span>{item.label}</span></Link>)}</nav>;
}

const menuItems = [
  { href: "https://tidelight.app/developers", title: "Intelligence Cloud", note: "Build on Tidelight market intelligence", key: "platform" },
  { href: "https://dev.tidelight.app", title: "Documentation", note: "Guides, API reference, and quickstarts", key: "docs" },
  { href: "https://package.tidelight.app", title: "Packages", note: "SDK, MCP, Python, React, and CLI", key: "packages" },
  { href: "https://tidelight.app/developers/support", title: "Human support", note: "Talk directly with the Tidelight team", key: "support" },
] as const;

export function PlatformNav({ active = "platform", ecosystem }: PlatformNavProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuId = useId();
  const menuTitleId = useId();
  const toggleRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const currentSystem = ecosystem ?? (active === "packages" ? "packages" : active === "support" ? "tidelight" : "intelligence");
  const homeHref = currentSystem === "packages" ? "https://package.tidelight.app/" : currentSystem === "tidelight" ? "https://tidelight.app/" : "https://tidelight.app/developers";
  const consoleHref = currentSystem === "packages" ? "https://package.tidelight.app/dashboard" : currentSystem === "tidelight" ? "https://tidelight.app/overview" : "https://tidelight.app/developers/console";

  useEffect(() => {
    if (!menuOpen) return;
    const toggle = toggleRef.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const firstFrame = window.requestAnimationFrame(() => {
      menuRef.current?.querySelector<HTMLElement>("a[href], button:not(:disabled)")?.focus();
    });
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setMenuOpen(false);
        return;
      }
      if (event.key !== "Tab" || !menuRef.current) return;
      const items = [...menuRef.current.querySelectorAll<HTMLElement>("a[href], button:not(:disabled), [tabindex]:not([tabindex='-1'])")];
      const first = items[0];
      const last = items[items.length - 1];
      if (!first || !last) {
        event.preventDefault();
        return;
      }
      if (event.shiftKey && (document.activeElement === first || !menuRef.current.contains(document.activeElement))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !menuRef.current.contains(document.activeElement))) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      window.cancelAnimationFrame(firstFrame);
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      if (toggle?.isConnected) toggle.focus();
    };
  }, [menuOpen]);

  return <><nav className="tic-top tic-premium-top tic-platform-nav" aria-label="Developer navigation">
    <Link href={homeHref} className="tic-brand">
      <Image src="/tidelight-mark.svg" alt="" width={30} height={30} priority />
      <span className="tic-brand-name">Tidelight</span>
      <span className="tic-brand-divider" aria-hidden="true" />
      <span>{active === "packages" ? "Packages" : active === "support" ? "Support" : "Intelligence Cloud"}</span>
    </Link>
    <div className="tic-platform-nav-links">
      <Link href="https://dev.tidelight.app">Docs</Link>
      <Link href="https://package.tidelight.app" aria-current={active === "packages" ? "page" : undefined}>Packages</Link>
      <Link href={`https://tidelight.app/developers/support?ecosystem=${currentSystem}`} aria-current={active === "support" ? "page" : undefined}>Support</Link>
      <EcosystemSwitcher current={currentSystem} />
      <ThemeQuickSwitch />
      <Link href={consoleHref} className="tic-button tic-nav-cta">{currentSystem === "packages" ? "Open dashboard" : "Open console"} <span aria-hidden="true">↗</span></Link>
    </div>
    {active !== "support" ? <Link
      href={consoleHref}
      className="tic-mobile-quick-cta"
      aria-label={currentSystem === "packages" ? "Open package dashboard" : "Open developer console"}
    >{currentSystem === "packages" ? "Dashboard" : "Console"}<span aria-hidden="true">↗</span></Link> : null}
    <div className={`tic-mobile-menu${menuOpen ? " is-open" : ""}`}>
      <button
        className="tic-mobile-menu-toggle"
        type="button"
        ref={toggleRef}
        aria-label="Open developer navigation"
        aria-expanded={menuOpen}
        aria-controls={menuId}
        aria-hidden={menuOpen || undefined}
        tabIndex={menuOpen ? -1 : 0}
        onClick={() => setMenuOpen(value => !value)}
      >
        <span className="tic-mobile-menu-icon" aria-hidden="true"><i /><i /></span>
        <span className="tic-mobile-menu-label">{menuOpen ? "Close" : "Menu"}</span>
      </button>
      <div
        className="tic-mobile-menu-panel"
        ref={menuRef}
        id={menuId}
        role="dialog"
        aria-modal="true"
        aria-labelledby={menuTitleId}
        tabIndex={-1}
        hidden={!menuOpen}
      >
        <div className="tic-mobile-menu-heading">
          <div className="tic-mobile-menu-brand-row">
            <Link href={homeHref} className="tic-brand" onClick={() => setMenuOpen(false)}>
              <Image src="/tidelight-mark.svg" alt="" width={30} height={30} />
              <span className="tic-brand-name">Tidelight</span>
              <span>{active === "packages" ? "Packages" : active === "support" ? "Support" : "Intelligence Cloud"}</span>
            </Link>
            <button className="tic-mobile-menu-close" type="button" aria-label="Close developer navigation" onClick={() => setMenuOpen(false)}>
              <span className="tic-mobile-menu-icon" aria-hidden="true"><i /><i /></span>
            </button>
          </div>
          <p className="tic-eyebrow" id={menuTitleId}>DEVELOPER PLATFORM</p>
          <div className="tic-mobile-ecosystem"><span>MOVE BETWEEN SYSTEMS</span><EcosystemSwitcher current={currentSystem} /></div>
        </div>
        <div className="tic-mobile-menu-items">
          {menuItems.map(item => <Link
            href={item.key === "support" && active === "packages" ? "https://tidelight.app/developers/support?ecosystem=packages" : item.href}
            key={item.key}
            aria-current={item.key === active ? "page" : undefined}
            onClick={() => setMenuOpen(false)}
          >
            <span><strong>{item.title}</strong><small>{item.note}</small></span>
            <span className="tic-mobile-menu-arrow" aria-hidden="true">→</span>
          </Link>)}
        </div>
        <div className="tic-mobile-menu-preferences">
          <span>Appearance</span>
          <ThemeQuickSwitch />
        </div>
        <Link href={consoleHref} className="tic-button tic-primary tic-mobile-menu-cta" onClick={() => setMenuOpen(false)}>{currentSystem === "packages" ? "Open package dashboard" : "Open console"} <span aria-hidden="true">→</span></Link>
        <p className="tic-mobile-menu-foot">Source-aware market and research infrastructure.</p>
      </div>
    </div>
  </nav>{active !== "support" ? <DeveloperMobileDock current={active === "packages" ? "packages" : "platform"} /> : null}</>;
}
