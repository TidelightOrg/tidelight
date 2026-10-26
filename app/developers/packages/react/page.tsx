import { TidelightSignatureFooter } from "@/app/ui/tidelight-signature-footer";
import Link from "next/link";
import type { Metadata } from "next";
import { PlatformNav } from "../../platform-nav";
import { ReactPackageDetail } from "../react-detail";
import "../../tidelight-developers.css";
import "../../platform-polish.css";
import "../packages.css";
import "../package-clarity.css";
import "../registry-live.css";

export const metadata: Metadata = {
  title: { absolute: "@tidelight/react — Official packages" },
  description: "Guide to the published Tidelight React hooks and accessible, server-safe UI components.",
  alternates: { canonical: "https://package.tidelight.app/react" },
};

export default function ReactPackagePage() {
  return <main className="tic tic-packages-page tic-package-detail-page">
    <PlatformNav active="packages" />
    <div className="tic-package-breadcrumb"><Link href="https://package.tidelight.app">Packages</Link><span>/</span><span>@tidelight/react</span></div>
    <ReactPackageDetail />
    <TidelightSignatureFooter surface="packages" />
  </main>;
}
