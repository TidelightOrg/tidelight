import { TidelightSignatureFooter } from "@/app/ui/tidelight-signature-footer";
import Link from "next/link";
import type { Metadata } from "next";
import { PlatformNav } from "../../platform-nav";
import { PackageDetail } from "../package-detail";
import "../../tidelight-developers.css";
import "../../platform-polish.css";
import "../packages.css";
import "../package-clarity.css";
import "../registry-live.css";

export const metadata: Metadata = {
  title: { absolute: "@tidelight/sdk — Official packages" },
  description: "Guide to the published Tidelight TypeScript SDK, including current API support, local build, authentication, and compatibility.",
  alternates: { canonical: "https://package.tidelight.app/sdk" },
};

export default function TypeScriptSdkPage() {
 return <main className="tic tic-packages-page tic-package-detail-page">
  <PlatformNav active="packages" />
  <div className="tic-package-breadcrumb"><Link href="https://package.tidelight.app">Packages</Link><span>/</span><span>@tidelight/sdk</span></div>
  <PackageDetail />
  <TidelightSignatureFooter surface="packages" />
 </main>;
}
