"use client";

import { useLanguage } from "@/app/ui/language-provider";
import Link from "next/link";
import { usePathname } from "next/navigation";

const groups = [
  ["Company events", "公司事件"],
  ["Tokenized markets", "代币化市场"],
  ["Macro context", "宏观背景"],
  ["Decision workflows", "决策流程"],
] as const;

export function LandingUseCaseMenuLinks() {
  const { language } = useLanguage();
  const pathname = usePathname();
  const t = (en: string, zh: string) => language === "zh-CN" ? zh : en;
  return <>
    <Link className="landing-mobile-menu-featured" href="/use-cases">{t("Explore use cases", "浏览使用场景")} <span aria-hidden="true">↗</span></Link>
    <div className="landing-mobile-menu-groups" aria-label={t("Use case categories", "使用场景类别")}>
      {groups.map(([en, zh], index) => {
        const targetId = `use-case-group-${index}`;
        const href = `/use-cases#${targetId}`;
        return <Link key={en} href={href} onClick={(event) => {
          if (pathname !== "/use-cases") return;
          event.preventDefault();
          window.history.replaceState(null, "", href);
          window.dispatchEvent(new CustomEvent("tidelight:reveal-use-case-category", { detail: { targetId } }));
        }}><i aria-hidden="true">0{index + 1}</i> {t(en, zh)}</Link>;
      })}
    </div>
  </>;
}
