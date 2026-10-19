import NotificationsCenter from "@/app/ui/notifications-center";
import { getServerUser } from "@/lib/supabase/auth-user";

export default async function NotificationsPage({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const { view } = await searchParams;
  const user = await getServerUser();
  return <NotificationsCenter signedIn={Boolean(user)} initialTab={view === "settings" ? "settings" : "all"} />;
}
