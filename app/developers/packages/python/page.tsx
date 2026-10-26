import { TidelightSignatureFooter } from "@/app/ui/tidelight-signature-footer";
import Link from "next/link";
import type { Metadata } from "next";
import { PlatformNav } from "../../platform-nav";
import { PythonPackageDetail } from "../python-detail";
import "../../tidelight-developers.css";
import "../../platform-polish.css";
import "../packages.css";
import "../package-clarity.css";
import "../registry-live.css";

export const metadata: Metadata = {
  title: { absolute: "Python SDK — Official packages" },
  description: "Guide to the published Tidelight Python SDK, supported API workflows, and secure server-side use.",
  alternates: { canonical: "https://package.tidelight.app/python" },
};

export default function PythonPackagePage() {
  return <main className="tic tic-packages-page tic-package-detail-page">
    <PlatformNav active="packages" />
    <div className="tic-package-breadcrumb"><Link href="https://package.tidelight.app">Packages</Link><span>/</span><span>Python SDK</span></div>
    <PythonPackageDetail />
    <TidelightSignatureFooter surface="packages" />
  </main>;
}
