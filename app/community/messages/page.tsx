import CommunityMessages from "@/app/ui/community-messages";
import { getServerUser } from "@/lib/supabase/auth-user";
export default async function MessagesPage(){const user=await getServerUser();return <CommunityMessages userId={user?.id??null}/>}
