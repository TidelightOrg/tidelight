import { TidelightSignatureFooter } from "@/app/ui/tidelight-signature-footer";
import Link from "next/link";
import type { Metadata } from "next";
import { PlatformNav } from "../../platform-nav";
import { CliPackageDetail } from "../cli-detail";
import "../../tidelight-developers.css";
import "../../platform-polish.css";
import "../packages.css";
import "../package-clarity.css";
import "../registry-live.css";

export const metadata: Metadata = {
  title: { absolute: "@tidelight/cli — Official packages" },
  description: "Command guide for the published Tidelight CLI with keychain-backed credentials and supported API workflows.",
  alternates: { canonical: "https://package.tidelight.app/cli" },
};

export default function CliPackagePage() {
  return <main className="tic tic-packages-page tic-package-detail-page">
    <PlatformNav active="packages" />
    <div className="tic-package-breadcrumb"><Link href="https://package.tidelight.app">Packages</Link><span>/</span><span>@tidelight/cli</span></div>
    <CliPackageDetail />
    <TidelightSignatureFooter surface="packages" />
  </main>;
}
