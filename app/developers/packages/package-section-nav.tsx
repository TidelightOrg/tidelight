"use client";

import { useEffect, useState } from "react";

export type PackageSection = { id: string; label: string };

export const packageSections = {
  sdk: [
    { id: "overview", label: "Overview" }, { id: "quickstart", label: "Quickstart" },
    { id: "api", label: "API surface" }, { id: "compatibility", label: "Compatibility" },
    { id: "security", label: "Security" }, { id: "releases", label: "Releases" },
  ],
  mcp: [
    { id: "overview", label: "Overview" }, { id: "quickstart", label: "Quickstart" },
    { id: "tools", label: "API & tools" }, { id: "examples", label: "Examples" },
    { id: "compatibility", label: "Compatibility" }, { id: "security", label: "Security" },
    { id: "releases", label: "Releases" },
  ],
  python: [
    { id: "overview", label: "Overview" }, { id: "quickstart", label: "Quickstart" },
    { id: "api", label: "API surface" }, { id: "compatibility", label: "Compatibility" },
    { id: "security", label: "Security" }, { id: "releases", label: "Releases" },
  ],
  react: [
    { id: "overview", label: "Overview" }, { id: "quickstart", label: "Quickstart" },
    { id: "hooks", label: "Hooks" }, { id: "components", label: "Components" },
    { id: "examples", label: "Examples" }, { id: "security", label: "Security" },
    { id: "releases", label: "Releases" },
  ],
  cli: [
    { id: "overview", label: "Overview" }, { id: "quickstart", label: "Quickstart" },
    { id: "commands", label: "Commands" }, { id: "security", label: "Security" },
    { id: "examples", label: "Examples" }, { id: "releases", label: "Releases" },
  ],
} as const satisfies Record<string, readonly PackageSection[]>;

export function PackageSectionNav({ sections }: { sections: readonly PackageSection[] }) {
  const [activeSection, setActiveSection] = useState(sections[0]?.id ?? "");
  const sectionIds = sections.map(section => section.id).join("|");

  useEffect(() => {
    const ids = sectionIds.split("|").filter(Boolean);
    const targets = ids
      .map(id => document.getElementById(id))
      .filter((target): target is HTMLElement => target instanceof HTMLElement);

    if (!targets.length) return;

    const syncFromHash = () => {
      let hash = "";
      try { hash = decodeURIComponent(window.location.hash.slice(1)); }
      catch { return; }
      if (ids.includes(hash)) {
        setActiveSection(hash);
        document.getElementById(hash)?.scrollIntoView({ block: "start" });
      }
    };
    const syncFromScroll = () => {
      const marker = window.innerHeight * 0.24;
      const ordered = targets
        .map(target => ({ target, top: target.getBoundingClientRect().top, bottom: target.getBoundingClientRect().bottom }))
        .filter(item => item.bottom > marker)
        .sort((left, right) => left.top - right.top);
      const current = [...ordered].reverse().find(item => item.top <= marker) ?? ordered[0];
      const atPageEnd = window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 4;
      setActiveSection((atPageEnd ? targets.at(-1) : current?.target)?.id ?? targets[0].id);
    };

    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(syncFromScroll);
    };
    const observer = new IntersectionObserver(syncFromScroll, { rootMargin: "-18% 0px -68% 0px", threshold: [0, 0.1] });

    targets.forEach(target => observer.observe(target));
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("hashchange", syncFromHash);
    syncFromHash();
    syncFromScroll();
    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("hashchange", syncFromHash);
      cancelAnimationFrame(frame);
    };
  }, [sectionIds]);

  const ids = sectionIds.split("|");
  return <nav className="tic-package-detail-nav" aria-label="Package sections">
    <span>ON THIS PAGE</span>
    <label className="tic-package-detail-select-label">
      <span className="tic-sr-only">Jump to package section</span>
      <select aria-label="Jump to package section" value={activeSection} onChange={(event) => {
        const id = event.currentTarget.value;
        setActiveSection(id);
        window.location.hash = id;
      }}>
        {sections.map((section) => <option key={section.id} value={section.id}>{section.label}</option>)}
      </select>
    </label>
    {sections.map((section, index) => <a
      key={section.id}
      href={`#${section.id}`}
      className={ids[index] === activeSection ? "is-active" : undefined}
      aria-current={ids[index] === activeSection ? "location" : undefined}
      onClick={() => setActiveSection(section.id)}
    >{section.label}</a>)}
  </nav>;
}
