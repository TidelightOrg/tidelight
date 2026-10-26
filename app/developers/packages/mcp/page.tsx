import { TidelightSignatureFooter } from "@/app/ui/tidelight-signature-footer";
import Link from "next/link";
import type { Metadata } from "next";
import { PlatformNav } from "../../platform-nav";
import { McpPackageDetail } from "../mcp-detail";
import "../../tidelight-developers.css";
import "../../platform-polish.css";
import "../packages.css";
import "../package-clarity.css";
import "../registry-live.css";

export const metadata: Metadata = {
  title: { absolute: "@tidelight/mcp — Official packages" },
  description: "Guide to the published Tidelight MCP stdio bridge, scopes, setup, security, and client compatibility.",
  alternates: { canonical: "https://package.tidelight.app/mcp" },
};

export default function McpPackagePage() {
 return <main className="tic tic-packages-page tic-package-detail-page">
 <PlatformNav active="packages" />
  <div className="tic-package-breadcrumb"><Link href="https://package.tidelight.app">Packages</Link><span>/</span><span>@tidelight/mcp</span></div>
  <McpPackageDetail />
  <TidelightSignatureFooter surface="packages" />
 </main>;
}
