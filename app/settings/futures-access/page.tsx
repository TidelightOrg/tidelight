import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import FuturesLiveAccessReview from "@/app/ui/futures-live-access-review";
import { isTidelightOperator } from "@/lib/auth/operator-access";
import { getServerUser } from "@/lib/supabase/auth-user";

export const dynamic = "force-dynamic";

export default async function FuturesAccessReviewPage() {
  const supabase = await createClient();
  const user = await getServerUser();
  if (!isTidelightOperator(user)) redirect("/overview");

  return <main className="content-wrap inner-page"><FuturesLiveAccessReview /></main>;
}
