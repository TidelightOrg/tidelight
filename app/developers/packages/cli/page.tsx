import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { PlatformNav } from "../../platform-nav";
import { CliPackageDetail } from "../cli-detail";
import "../../tidelight-developers.css";
import "../../platform-polish.css";
import "../packages.css";

export const metadata: Metadata = {
  title: { absolute: "@tidelight/cli — Official packages" },
  description: "Source-backed command guide for the unpublished Tidelight CLI with keychain-backed credentials and supported API workflows.",
  alternates: { canonical: "https://tidelight.app/developers/packages/cli" },
};

export default function CliPackagePage() {
  return <main className="tic tic-packages-page tic-package-detail-page">
    <PlatformNav active="packages" />
    <div className="tic-package-breadcrumb"><Link href="/developers/packages">Packages</Link><span>/</span><span>@tidelight/cli</span></div>
    <CliPackageDetail />
    <footer className="tic-footer"><Link href="/developers" className="tic-brand"><Image src="/tidelight-mark.svg" alt="" width={23} height={23}/><span className="tic-brand-name">Tidelight</span><span>Intelligence Cloud</span></Link><Link href="/developers/packages">All packages →</Link></footer>
  </main>;
}
