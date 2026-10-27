import type { Metadata } from "next";
import LandingUseCases from "@/app/ui/landing-use-cases";
import { LandingNavigation } from "@/app/ui/landing-navigation";
import { TidelightSignatureFooter } from "@/app/ui/tidelight-signature-footer";

export const metadata: Metadata = {
  title: "Use cases — Tidelight",
  description: "Explore eight source-led research paths for company events, tokenized markets, macro context, and decision workflows.",
  alternates: { canonical: "https://tidelight.app/use-cases" },
  openGraph: {
    title: "Use cases — Tidelight",
    description: "Start with a market question. Follow the evidence, context, and risks through a clear Tidelight research path.",
    url: "https://tidelight.app/use-cases",
    siteName: "Tidelight",
    type: "website",
  },
};

export default function UseCasesPage() {
  return <main className="landing-page use-cases-page">
    <LandingNavigation />
    <LandingUseCases />
    <TidelightSignatureFooter surface="research" />
  </main>;
}
