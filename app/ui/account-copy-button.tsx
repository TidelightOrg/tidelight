"use client";

import { useState } from "react";
import { useLanguage } from "@/app/ui/language-provider";

export default function AccountCopyButton({ value }: { value: string }) {
  const { translate } = useLanguage();
  const [status, setStatus] = useState("");
  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setStatus(translate("Copied"));
    } catch {
      setStatus(translate("Select ID to copy"));
    }
    window.setTimeout(() => setStatus(""), 4000);
  }
  return <><span className="account-center-row-value account-center-uid" title={value}>{value}</span><button type="button" className="account-center-copy" onClick={() => void copy()} aria-label={translate("Copy Tidelight UID")}>{status || translate("Copy ID")}</button><span className="account-center-copy-status" role="status" aria-live="polite">{status}</span></>;
}
