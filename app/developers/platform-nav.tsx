"use client";

import { useEffect, useId, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ThemeQuickSwitch } from "@/app/ui/theme-provider";
import { EcosystemSwitcher } from "./ecosystem-switcher";

type PlatformNavProps = {
  active?: "platform" | "packages";
};

const menuItems = [
  { href: "https://tidelight.app/developers", title: "Intelligence Cloud", note: "Build on Tidelight market intelligence", key: "platform" },
  { href: "https://dev.tidelight.app", title: "Documentation", note: "Guides, API reference, and quickstarts", key: "docs" },
  { href: "https://package.tidelight.app", title: "Packages", note: "SDK, MCP, Python, React, and CLI", key: "packages" },
] as const;

export function PlatformNav({ active = "platform" }: PlatformNavProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuId = useId();
  const menuTitleId = useId();
  const toggleRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const homeHref = active === "packages" ? "https://package.tidelight.app/" : "https://tidelight.app/developers";

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

  return <nav className="tic-top tic-premium-top tic-platform-nav" aria-label="Developer navigation">
    <Link href={homeHref} className="tic-brand">
      <Image src="/tidelight-mark.svg" alt="" width={30} height={30} priority />
      <span className="tic-brand-name">Tidelight</span>
      <span className="tic-brand-divider" aria-hidden="true" />
      <span>{active === "packages" ? "Packages" : "Intelligence Cloud"}</span>
    </Link>
    <div className="tic-platform-nav-links">
      <Link href="https://dev.tidelight.app">Docs</Link>
      <Link href="https://package.tidelight.app" aria-current={active === "packages" ? "page" : undefined}>Packages</Link>
      <EcosystemSwitcher current={active === "packages" ? "packages" : "intelligence"} />
      <ThemeQuickSwitch />
      <Link href="https://tidelight.app/developers/console" className="tic-button tic-nav-cta">Open console <span aria-hidden="true">↗</span></Link>
    </div>
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
              <span>{active === "packages" ? "Packages" : "Intelligence Cloud"}</span>
            </Link>
            <button className="tic-mobile-menu-close" type="button" aria-label="Close developer navigation" onClick={() => setMenuOpen(false)}>
              <span className="tic-mobile-menu-icon" aria-hidden="true"><i /><i /></span>
            </button>
          </div>
          <p className="tic-eyebrow" id={menuTitleId}>DEVELOPER PLATFORM</p>
          <div className="tic-mobile-ecosystem"><span>MOVE BETWEEN SYSTEMS</span><EcosystemSwitcher current={active === "packages" ? "packages" : "intelligence"} /></div>
        </div>
        <div className="tic-mobile-menu-items">
          {menuItems.map(item => <Link
            href={item.href}
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
        <Link href="https://tidelight.app/developers/console" className="tic-button tic-primary tic-mobile-menu-cta" onClick={() => setMenuOpen(false)}>Open console <span aria-hidden="true">→</span></Link>
        <p className="tic-mobile-menu-foot">Source-aware market and research infrastructure.</p>
      </div>
    </div>
  </nav>;
}
