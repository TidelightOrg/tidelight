"use client";

import { useEffect, useId, useRef, useState } from "react";
import "./ecosystem-switcher.css";

type EcosystemSwitcherProps = {
  current: "tidelight" | "intelligence" | "packages";
};

const systems = [
  {
    id: "tidelight",
    name: "Tidelight",
    note: "Market research and trading workspace",
    landing: { label: "Landing page", href: "https://tidelight.app/" },
    dashboard: { label: "Workspace", href: "https://tidelight.app/overview" },
  },
  {
    id: "intelligence",
    name: "Intelligence Cloud",
    note: "API, MCP, keys, and developer tools",
    landing: { label: "Platform home", href: "https://tidelight.app/developers" },
    dashboard: { label: "Developer console", href: "https://tidelight.app/developers/console" },
  },
  {
    id: "packages",
    name: "Packages",
    note: "Official SDKs and integration guides",
    landing: { label: "Packages home", href: "https://package.tidelight.app/" },
    dashboard: { label: "Package dashboard", href: "https://package.tidelight.app/dashboard" },
  },
] as const;

export function EcosystemSwitcher({ current }: EcosystemSwitcherProps) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node && !rootRef.current?.contains(event.target)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return <div className={`tic-ecosystem-switcher${open ? " is-open" : ""}`} ref={rootRef}>
    <button className="tic-ecosystem-trigger" type="button" aria-expanded={open} aria-controls={id} onClick={() => setOpen(value => !value)}>
      <span className="tic-ecosystem-trigger-mark" aria-hidden="true"><i/><i/><i/></span>
      <span>Ecosystem</span><span className="tic-ecosystem-chevron" aria-hidden="true">⌄</span>
    </button>
    {open ? <section className="tic-ecosystem-panel" id={id} aria-label="Switch Tidelight system">
      <header><span className="tic-eyebrow">ONE CONNECTED ECOSYSTEM</span><strong>Choose a system</strong><p>Move between Tidelight, Intelligence Cloud, and Packages with the same account.</p></header>
      <div className="tic-ecosystem-list">{systems.map(system => <article key={system.id} className={system.id === current ? "is-current" : ""}>
        <div className="tic-ecosystem-system-heading"><span className="tic-ecosystem-system-dot" aria-hidden="true"/><div><strong>{system.name}</strong><small>{system.note}</small></div>{system.id === current ? <span className="tic-ecosystem-current">CURRENT</span> : null}</div>
        <div className="tic-ecosystem-destinations"><a href={system.landing.href}>{system.landing.label}<span aria-hidden="true">↗</span></a><a href={system.dashboard.href}>{system.dashboard.label}<span aria-hidden="true">→</span></a></div>
      </article>)}</div>
      <footer>One Tidelight identity · Three dedicated experiences</footer>
    </section> : null}
  </div>;
}
