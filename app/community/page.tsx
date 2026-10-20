import { createClient } from "@/lib/supabase/server";
import CommunityDesk from "@/app/ui/community-desk";
import { getServerUser } from "@/lib/supabase/auth-user";
export default async function CommunityPage(){const supabase=await createClient();const user=await getServerUser();const {data:profile}=user?await supabase.from("community_profiles").select("id,handle,display_name,avatar_url").eq("id",user.id).maybeSingle():{data:null};return <CommunityDesk signedIn={Boolean(user)} userId={user?.id??null} profile={profile??null}/>}
