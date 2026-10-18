import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { PlatformNav } from "../../platform-nav";
import { ReactPackageDetail } from "../react-detail";
import "../../tidelight-developers.css";
import "../../platform-polish.css";
import "../packages.css";
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
    <footer className="tic-footer"><Link href="https://package.tidelight.app" className="tic-brand"><Image src="/tidelight-mark.svg" alt="" width={23} height={23}/><span className="tic-brand-name">Tidelight</span><span>Packages</span></Link><div><Link href="https://package.tidelight.app/dashboard">Package dashboard →</Link><Link href="https://package.tidelight.app">All packages</Link></div></footer>
  </main>;
}
