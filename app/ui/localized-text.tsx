"use client";

import { useLanguage } from "@/app/ui/language-provider";

export function LocalizedText({ children }: { children: string }) {
  const { translate } = useLanguage();
  return translate(children);
}
