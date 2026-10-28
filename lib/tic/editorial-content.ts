import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { BlogArticle } from "@/app/blog/articles";

export type MaintenanceNotice = {
  id: string;
  title: string;
  subtitle: string;
  message: string;
  affected_services: string[];
  status: "scheduled" | "ongoing" | "completed";
  starts_at: string;
  ends_at: string | null;
  created_at: string;
  updated_at: string;
};

export type EditorialPost = {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  category: string;
  body: string;
  status: "draft" | "published";
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

const admin = () => createAdminClient();

export async function getMaintenanceNotices(): Promise<MaintenanceNotice[]> {
  const recentResolutionCutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await admin().from("tic_status_maintenance")
    .select("id,title,subtitle,message,affected_services,status,starts_at,ends_at,created_at,updated_at")
    .or(`status.neq.completed,ends_at.gte.${recentResolutionCutoff}`)
    .order("starts_at", { ascending: false }).order("id", { ascending: true }).limit(50);
  if (error) throw new Error("Maintenance notices could not be loaded.");
  return (data ?? []) as MaintenanceNotice[];
}

export async function getCompletedMaintenanceHistory(from: string, before: string): Promise<MaintenanceNotice[]> {
  const { data, error } = await admin().from("tic_status_maintenance")
    .select("id,title,subtitle,message,affected_services,status,starts_at,ends_at,created_at,updated_at")
    .eq("status", "completed")
    .or(`and(ends_at.gte.${from},ends_at.lt.${before}),and(ends_at.is.null,starts_at.gte.${from},starts_at.lt.${before})`)
    .order("ends_at", { ascending: false, nullsFirst: false }).order("starts_at", { ascending: false }).order("id", { ascending: true }).limit(500);
  if (error) throw new Error("Maintenance history could not be loaded.");
  return (data ?? []) as MaintenanceNotice[];
}

export async function getOperatorEditorialContent(): Promise<{ maintenance: MaintenanceNotice[]; posts: EditorialPost[] }> {
  const client = admin();
  const [maintenance, posts] = await Promise.all([
    client.from("tic_status_maintenance")
      .select("id,title,subtitle,message,affected_services,status,starts_at,ends_at,created_at,updated_at")
      .order("starts_at", { ascending: false }).order("id", { ascending: true }).limit(50),
    client.from("tic_blog_posts")
      .select("id,slug,title,subtitle,category,body,status,published_at,created_at,updated_at")
      .order("updated_at", { ascending: false }).order("id", { ascending: true }).limit(50),
  ]);
  if (maintenance.error || posts.error) throw new Error("Operator content could not be loaded.");
  return {
    maintenance: (maintenance.data ?? []) as MaintenanceNotice[],
    posts: (posts.data ?? []) as EditorialPost[],
  };
}

function toArticle(post: EditorialPost): BlogArticle {
  const publishedAt = post.published_at ?? post.created_at;
  const words = post.body.trim().split(/\s+/).filter(Boolean).length;
  return {
    slug: post.slug,
    category: post.category,
    date: new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" }).format(new Date(publishedAt)),
    readTime: `${Math.max(1, Math.ceil(words / 220))} min read`,
    title: post.title,
    dek: post.subtitle,
    sections: [{ heading: "The update", paragraphs: post.body.split(/\n{2,}/).map(part => part.trim()).filter(Boolean) }],
  };
}

export async function getPublishedBlogArticles(): Promise<BlogArticle[]> {
  const { data, error } = await admin().from("tic_blog_posts")
    .select("id,slug,title,subtitle,category,body,status,published_at,created_at,updated_at")
    .eq("status", "published")
    .not("published_at", "is", null)
    .order("published_at", { ascending: false }).limit(100);
  if (error) throw new Error("Published Field Notes could not be loaded.");
  return ((data ?? []) as EditorialPost[]).map(toArticle);
}

export async function getBlogArticleBySlug(slug: string): Promise<BlogArticle | undefined> {
  const { data, error } = await admin().from("tic_blog_posts")
    .select("id,slug,title,subtitle,category,body,status,published_at,created_at,updated_at")
    .eq("slug", slug).eq("status", "published").not("published_at", "is", null).maybeSingle();
  if (error) throw new Error("Published Field Notes could not be loaded.");
  return data ? toArticle(data as EditorialPost) : undefined;
}
