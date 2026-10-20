import type { Metadata } from "next";
import { cookies, headers } from "next/headers";
import "./globals.css";
import "./theme-polish.css";
import "./nightwatch.css";
import { createClient } from "@/lib/supabase/server";
import { getServerAuthState } from "@/lib/supabase/auth-user";
import { isTidelightOperator } from "@/lib/auth/operator-access";
import WorkspaceShell from "./ui/workspace-shell";
import AnalyticsConsent from "./ui/analytics-consent";
import { ThemeProvider } from "./ui/theme-provider";
import { LanguageProvider } from "./ui/language-provider";
import SupportCompanion from "./ui/support-companion";
import ProductQuickActions from "./ui/product-quick-actions";
import { IntelligenceProvider } from "./ui/intelligence-provider";
import "./support-companion.css";
import "./landing.css";
import "./mobile-polish.css";
import "./stock-market.css";
import "./language.css";
import "./product-quick-actions.css";
import "./overview/intelligent-overview.css";
import "./tidelight-animated-mark.css";
import "./account-center.css";
import "./notifications/notifications.css";

const baseMetadata: Metadata = {
  metadataBase: new URL("https://tidelight.app"),
  alternates: { canonical: "https://tidelight.app" },
  title: "Tidelight — See the signal between sessions",
  description: "An after-hours research desk for tokenized US equities. Follow market events with clear context, scenarios, and sources.",
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/tidelight-mark.svg", type: "image/svg+xml" },
    ],
  },
  manifest: "/manifest.webmanifest",
  openGraph: {
    title: "Tidelight — See the signal between sessions",
    description: "Clear, source-led research for markets that never sleep.",
    url: "https://tidelight.app",
    siteName: "Tidelight",
    images: [{ url: "/tidelight-social.png", width: 1200, height: 630, alt: "Tidelight — clarity after the closing bell" }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Tidelight — See the signal between sessions",
    description: "An after-hours research desk for tokenized US equities. Follow market events with clear context, scenarios, and sources.",
    images: [{ url: "/tidelight-social.png", alt: "Tidelight — clarity after the closing bell" }],
  },
};

export async function generateMetadata(): Promise<Metadata> {
  const cookieStore = await cookies();
  if (cookieStore.get("tidelight-language")?.value !== "zh-CN") return baseMetadata;
  return {
    ...baseMetadata,
    title: "Tidelight — 看清交易时段之间的市场信号",
    description: "面向代币化美股的市场研究工作台。沿着市场事件、证据、影响敞口和情景，做出更清晰的判断。",
    openGraph: { ...baseMetadata.openGraph, title: "Tidelight — 看清交易时段之间的市场信号", description: "清晰、以来源为依据的研究，助你看懂永不休眠的市场。" },
    twitter: { ...baseMetadata.twitter, title: "Tidelight — 看清交易时段之间的市场信号", description: "面向代币化美股的市场研究工作台。沿着市场事件、证据、影响敞口和情景，做出更清晰的判断。" },
  };
}

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const cookieStore = await cookies();
  const requestHeaders = await headers();
  const requestHost = (requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "").split(",")[0].trim().toLowerCase().replace(/:\d+$/, "");
  const isPublicPackageHost = requestHost === "package.tidelight.app";
  const isPublicBlogHost = requestHost === "blogs.tidelight.app";
  const isStandaloneDeveloperHost = isPublicPackageHost || isPublicBlogHost;
  const language = cookieStore.get("tidelight-language")?.value === "zh-CN" ? "zh-CN" : "en";
  const supabase = isStandaloneDeveloperHost ? null : await createClient();
  const authState = isStandaloneDeveloperHost
    ? { user: null, errorCode: null, errorName: null, sessionPresent: false, refreshTokenPresent: false }
    : await getServerAuthState();
  const user = authState.user;
  const authCookieCounts = new Map<string, number>();
  for (const pair of (requestHeaders.get("cookie") ?? "").split(/;\s*/)) {
    const name = pair.slice(0, pair.indexOf("=")).trim();
    if (/^sb-[a-z0-9-]+-auth-token(?:\.\d+)?$/i.test(name)) authCookieCounts.set(name, (authCookieCounts.get(name) ?? 0) + 1);
  }
  const authCookieCount = [...authCookieCounts.values()].reduce((count, value) => count + value, 0);
  const duplicateAuthCookieCount = [...authCookieCounts.values()].filter((count) => count > 1).length;
  const parsedAuthCookieCount = cookieStore.getAll().filter(({ name }) => /^sb-[a-z0-9-]+-auth-token(?:\.\d+)?$/i.test(name)).length;
  const authCookieShape = cookieStore.getAll().filter(({ name }) => /^sb-[a-z0-9-]+-auth-token(?:\.\d+)?$/i.test(name)).map(({ name, value }) => name + ":" + (typeof value === "string" ? value.length : "missing")).sort().join(",");
  const { data: profile } = user && supabase
    ? await supabase.from("community_profiles").select("display_name,avatar_url").eq("id", user.id).maybeSingle()
    : { data: null };
  const metadata = user?.user_metadata ?? {};
  const metadataAvatar = typeof metadata.avatar_url === "string"
    ? metadata.avatar_url
    : typeof metadata.picture === "string" ? metadata.picture : null;
  const displayName = profile?.display_name?.trim()
    || (typeof metadata.full_name === "string" ? metadata.full_name : null)
    || user?.email?.split("@")[0]
    || null;

  return <html lang={language} data-language={language} data-theme="daylight" suppressHydrationWarning><body data-tic-auth-state={user ? "signed-in" : "guest"} data-tic-auth-error={authState.errorCode ?? "none"} data-tic-auth-error-name={authState.errorName ?? "none"} data-tic-auth-session-present={authState.sessionPresent} data-tic-auth-refresh-token-present={authState.refreshTokenPresent} data-tic-auth-cookie-count={authCookieCount} data-tic-auth-parsed-cookie-count={parsedAuthCookieCount} data-tic-auth-cookie-shape={authCookieShape} data-tic-auth-duplicate-count={duplicateAuthCookieCount} data-tic-request-host={requestHost} data-tic-standalone-host={isStandaloneDeveloperHost}><ThemeProvider><LanguageProvider initialLanguage={language}><IntelligenceProvider>{isStandaloneDeveloperHost ? <>{children}<AnalyticsConsent /></> : <WorkspaceShell email={user?.email ?? null} avatarUrl={profile?.avatar_url ?? metadataAvatar} displayName={displayName} isOperator={isTidelightOperator(user)}>{children}</WorkspaceShell>}{isStandaloneDeveloperHost ? null : <><SupportCompanion /><ProductQuickActions /></>}</IntelligenceProvider></LanguageProvider></ThemeProvider></body></html>;
}
