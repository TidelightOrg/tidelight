import { redirect } from "next/navigation";
import FuturesLiveAccessReview from "@/app/ui/futures-live-access-review";
import { isTidelightOperator } from "@/lib/auth/operator-access";
import { getServerUser } from "@/lib/supabase/auth-user";

export const dynamic = "force-dynamic";

export default async function FuturesAccessReviewPage() {
  const user = await getServerUser();
  if (!isTidelightOperator(user)) redirect("/overview");

  return <main className="content-wrap inner-page"><FuturesLiveAccessReview /></main>;
}
