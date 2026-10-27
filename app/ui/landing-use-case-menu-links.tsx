"use client";

import { useLanguage } from "@/app/ui/language-provider";

const groups = [
  ["Company events", "公司事件"],
  ["Tokenized markets", "代币化市场"],
  ["Macro context", "宏观背景"],
  ["Decision workflows", "决策流程"],
] as const;

export function LandingUseCaseMenuLinks() {
  const { language } = useLanguage();
  const t = (en: string, zh: string) => language === "zh-CN" ? zh : en;
  return <>
    <a className="landing-mobile-menu-featured" href="/use-cases">{t("Explore use cases", "浏览使用场景")} <span aria-hidden="true">↗</span></a>
    <div className="landing-mobile-menu-groups" aria-label={t("Use case categories", "使用场景类别")}>
      {groups.map(([en, zh], index) => <a key={en} href={`/use-cases#use-case-group-${index}`}><i aria-hidden="true">0{index + 1}</i> {t(en, zh)}</a>)}
    </div>
  </>;
}
