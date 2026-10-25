import Link from "next/link";
import Image from "next/image";
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
  <footer className="tic-footer"><Link href="https://package.tidelight.app" className="tic-brand"><Image src="/tidelight-mark.svg" alt="" width={23} height={23}/><span className="tic-brand-name">Tidelight</span><span>Packages</span></Link><div><Link href="https://package.tidelight.app/dashboard">Package dashboard →</Link><Link href="https://package.tidelight.app">All packages</Link><Link href="https://github.com/TidelightOrg/tidelight" target="_blank" rel="noreferrer">GitHub ↗</Link><Link href="https://x.com/TidelightOrg" target="_blank" rel="noreferrer">X ↗</Link><Link href="https://tidelight.app/developers">Intelligence Cloud</Link></div></footer>
 </main>;
}
