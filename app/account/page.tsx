import Image from "next/image";
import Link from "next/link";
import { signOut } from "@/app/actions";
import AccountTabs, { type AccountGroup } from "@/app/ui/account-tabs";
import { cookies, headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { getServerAuthState } from "@/lib/supabase/auth-user";

export default async function AccountPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const authProbe = params["auth-probe"] === "diag";
  const supabase = await createClient();
  const authState = await getServerAuthState();
  const user = authState.user;
  const requestHeaders = authProbe ? await headers() : null;
  const cookieStore = authProbe ? await cookies() : null;
  const authCookiePattern = /^sb-[a-z0-9-]+-auth-token(?:\.\d+)?$/i;
  const requestCookieShape = (requestHeaders?.get("cookie") ?? "").split(/;\s*/).flatMap((pair) => {
    const separator = pair.indexOf("=");
    if (separator < 1) return [];
    const name = pair.slice(0, separator).trim();
    return authCookiePattern.test(name) ? [name + ":" + pair.slice(separator + 1).length] : [];
  }).sort().join(",");
  const parsedCookieShape = cookieStore?.getAll().filter(({ name }) => authCookiePattern.test(name)).map(({ name, value }) => name + ":" + value.length).sort().join(",") ?? "not-requested";
  const { data: profile } = user ? await supabase.from("community_profiles").select("handle,display_name,avatar_url").eq("id", user.id).maybeSingle() : { data: null };
  const name = profile?.display_name || user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Tidelight guest";
  const groups: AccountGroup[] = [
    { id: "my-info", title: "My info", intro: "Your Tidelight identity and connected workspace.", rows: [
      { label: "Profile picture", detail: "Update the photo shown on your community profile", href: "/settings#account-profile", icon: "◉", value: "↗" },
      { label: "Nickname & handle", detail: "Your display name and community username", href: "/settings#account-profile", icon: "▤", value: profile?.handle ? `@${profile.handle}` : "Set up" },
      ...(user ? [{ label: "Tidelight UID", detail: "Private account reference · tap to copy", icon: "ID", value: user.id }] : []),
      { label: "Identity verification", detail: "Tidelight does not hold customer funds or provide exchange KYC", href: "/settings#account-connections", icon: "✓", state: "Not required" },
      { label: "Tidelight plan", detail: "Your research workspace access · no paid tier configured", href: "/about", icon: "✦", state: "Core" },
      { label: "Trading fees", detail: "Execution fees are set by Bitget and shown by the exchange", href: "/trading", icon: "%", value: "Bitget" },
      { label: "Subaccounts", detail: "Tidelight does not create exchange subaccounts", icon: "♧", state: "Bitget only" },
      { label: "Linked accounts", detail: "Tidelight community identity and sign-in methods", href: "/settings#account-profile", icon: "@", value: "Manage" },
      { label: "Community profile", detail: "Posts, follows, and public profile details", href: "/community", icon: "♧", value: "↗" },
    ] },
    { id: "security", title: "Security", intro: "Protect sign-in, account data, and any trading action you authorize.", rows: [
      { label: "Sign-in email", detail: "Your verified account identity", icon: "✉", value: user?.email ?? "Guest" },
      { label: "Authenticator MFA", detail: "Protect sensitive controls and each live Bitget order", href: user ? "/settings#account-security" : "/login", icon: "⌑", value: user ? "Manage" : "Sign in" },
      { label: "Recent security activity", detail: "Review account checks and protected actions", href: user ? "/settings#account-security-activity" : "/login", icon: "◷", value: "View" },
      { label: "Passkeys & trusted devices", detail: "Passkey enrollment is not enabled for this deployment", icon: "▣", state: "Unavailable" },
      { label: "Anti-phishing code", detail: "Tidelight does not offer a personal email code yet", icon: "⌑", state: "Not available" },
      { label: "Live order protection", detail: "MFA, risk limits, and per-order confirmation", href: "/futures", icon: "◇", state: "Protected" },
      { label: "Bitget connection", detail: "Review connected exchange credentials and permissions", href: "/trading?intent=live", icon: "↗", value: "Manage" },
      { label: "Fund password & withdrawal security", detail: "Tidelight never holds or withdraws your exchange funds", href: "/settings#account-connections", icon: "▱", state: "Bitget only" },
    ] },
    { id: "preference", title: "Preference", intro: "Tune how Tidelight presents research and sends product updates.", rows: [
      { label: "Currency display", detail: "US equity and paper-trading values are quoted in US dollars", icon: "$", state: "USD" },
      { label: "Color theme", detail: "Choose Daylight, Night Tide, or Blue Hour", href: "/settings#account-appearance", icon: "◐", value: "Change" },
      { label: "Language", detail: "Choose the display language for your workspace", href: "/settings#account-preferences", icon: "文", value: "Manage" },
      { label: "Research lens", detail: "Set your account’s default research risk profile", href: "/settings#account-profile", icon: "⌁", value: "Manage" },
      { label: "Withdrawal address & limits", detail: "Manage these only in your Bitget account; Tidelight cannot withdraw", href: "/trading", icon: "⌑", state: "Bitget only" },
      { label: "Deposit routing", detail: "Tidelight does not accept deposits or hold customer balances", icon: "↪", state: "Not offered" },
      { label: "Notifications & email subscriptions", detail: "Manage your Nightwatch inbox and email delivery choices", href: "/notifications?view=settings", icon: "♧", value: "Manage" },
      { label: "Always on / screen lock", detail: "Screen locking is controlled by your browser and device", icon: "▣", state: "Device setting" },
    ] },
    { id: "general", title: "General", intro: "Help, feedback, product information, and local data controls.", rows: [
      { label: "Help Center", detail: "Product guides and common questions", href: "/help", icon: "?" },
      { label: "Trade market overview", detail: "Explore tokenized US equities and market context", href: "/overview", icon: "⌁" },
      { label: "Contact Support", detail: "Reach the Tidelight support team", href: "/contact", icon: "◖" },
      { label: "User feedback & rating", detail: "Send a private rating or product suggestion", href: "/rate", icon: "☆" },
      { label: "About Tidelight", detail: "Our research approach and product principles", href: "/about", icon: "i" },
      { label: "Storage management", detail: "Review local browser data without deleting account records", href: "/storage", icon: "▱" },
    ] },
  ];
  return <main className="content-wrap inner-page account-center" data-tic-account-auth-state={user ? "signed-in" : "guest"}>
    {authProbe ? <details open><summary>Temporary auth diagnostics</summary><pre>{JSON.stringify({ pageUser: Boolean(user), authError: authState.errorCode, authErrorName: authState.errorName, requestHost: requestHeaders?.get("x-forwarded-host") ?? requestHeaders?.get("host") ?? null, requestCookieShape, parsedCookieShape, originalProxyCookieShape: requestHeaders?.get("x-tic-original-auth-cookie-shape") ?? null, proxyClaims: requestHeaders?.get("x-tic-proxy-claims-state") ?? null, proxySetCookieShape: requestHeaders?.get("x-tic-proxy-set-cookie-shape") ?? null, proxyPostRefreshCookieShape: requestHeaders?.get("x-tic-proxy-post-refresh-cookie-shape") ?? null }, null, 2)}</pre></details> : null}
    <header className="account-center-hero"><div className="account-center-identity"><div className="account-center-avatar">{profile?.avatar_url ? <Image src={profile.avatar_url} alt="" width={70} height={70} unoptimized /> : name.slice(0,1).toUpperCase()}</div><div><span className="eyebrow">TIDELIGHT ACCOUNT</span><h1>{name}</h1><p>{user?.email ?? "Sign in to save preferences and secure your research."}{profile?.handle ? ` · @${profile.handle}` : ""}</p></div></div><Link className="account-center-edit" href={user ? "/settings#account-profile" : "/login"}>{user ? "Edit profile" : "Sign in"}<span>↗</span></Link></header>
    <AccountTabs groups={groups} userId={user?.id} />
    <footer className="account-center-footer"><Link href="/terms">Terms</Link><Link href="/privacy">Privacy</Link>{user ? <form action={signOut}><button className="account-center-logout" type="submit">Log out</button></form> : null}<span>Clarity when the bell is quiet.</span></footer>
  </main>;
}
