import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { PlatformNav } from "../../platform-nav";
import { PythonPackageDetail } from "../python-detail";
import "../../tidelight-developers.css";
import "../../platform-polish.css";
import "../packages.css";
import "../registry-live.css";

export const metadata: Metadata = {
  title: { absolute: "Python SDK — Official packages" },
  description: "Guide to the published Tidelight Python SDK, supported API workflows, and secure server-side use.",
  alternates: { canonical: "https://tidelight.app/developers/packages/python" },
};

export default function PythonPackagePage() {
  return <main className="tic tic-packages-page tic-package-detail-page">
    <PlatformNav active="packages" />
    <div className="tic-package-breadcrumb"><Link href="/developers/packages">Packages</Link><span>/</span><span>Python SDK</span></div>
    <PythonPackageDetail />
    <footer className="tic-footer"><Link href="/developers" className="tic-brand"><Image src="/tidelight-mark.svg" alt="" width={23} height={23}/><span className="tic-brand-name">Tidelight</span><span>Intelligence Cloud</span></Link><Link href="/developers/packages">All packages →</Link></footer>
  </main>;
}
