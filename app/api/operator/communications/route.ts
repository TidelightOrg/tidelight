import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getServerUser } from "@/lib/supabase/auth-user";
import { isTidelightOperator } from "@/lib/auth/operator-access";
import { articles as builtInArticles } from "@/app/blog/articles";

export const dynamic = "force-dynamic";
const json = (body: object, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
const maintenanceStates = new Set(["scheduled", "ongoing", "completed"]);
const postStates = new Set(["draft", "published"]);

function text(value: unknown, max: number) {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized && normalized.length <= max ? normalized : null;
}

function validDate(value: unknown, optional = false): string | null | undefined {
  if ((value === null || value === "") && optional) return null;
  if (typeof value !== "string") return undefined;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : undefined;
}

function slugify(value: string) {
  return value.normalize("NFKD").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 100);
}

export async function POST(request: Request) {
  return save(request, false);
}

export async function PATCH(request: Request) {
  return save(request, true);
}

async function save(request: Request, update: boolean) {
  const user = await getServerUser();
  if (!user) return json({ error: "Sign in to continue." }, 401);
  if (!isTidelightOperator(user)) return json({ error: "Operator access is required." }, 403);

  let input: Record<string, unknown>;
  try {
    const value = await request.json();
    if (!value || typeof value !== "object" || Array.isArray(value)) return json({ error: "Check the content and try again." }, 400);
    input = value as Record<string, unknown>;
  } catch {
    return json({ error: "Check the content and try again." }, 400);
  }

  const id = typeof input.id === "string" ? input.id : "";
  if (update && !id) return json({ error: "Select a saved item to update." }, 400);
  const admin = createAdminClient();

  if (input.kind === "maintenance") {
    const title = text(input.title, 140);
    const subtitle = text(input.subtitle, 240);
    const message = text(input.message, 12000);
    const startsAt = validDate(input.startsAt);
    const endsAt = validDate(input.endsAt, true);
    const status = typeof input.status === "string" ? input.status : "";
    const affectedServices = Array.isArray(input.affectedServices)
      ? [...new Set(input.affectedServices.filter((item): item is string => typeof item === "string").map(item => item.trim()).filter(Boolean).slice(0, 30))]
      : [];
    if (!title || !subtitle || !message || !startsAt || endsAt === undefined || !maintenanceStates.has(status)) {
      return json({ error: "Add a heading, subheading, message, valid start time, and maintenance state." }, 400);
    }
    if (endsAt && Date.parse(endsAt) < Date.parse(startsAt)) return json({ error: "The end time must be after the start time." }, 400);
    const values = {
      title, subtitle, message, affected_services: affectedServices, status,
      starts_at: startsAt, ends_at: endsAt, updated_at: new Date().toISOString(),
      ...(update ? {} : { created_by_email: user.email ?? null }),
    };
    const query = update
      ? admin.from("tic_status_maintenance").update(values).eq("id", id)
      : admin.from("tic_status_maintenance").insert(values);
    const { data, error } = await query.select("id,title,subtitle,message,affected_services,status,starts_at,ends_at,created_at,updated_at").single();
    if (error) return json({ error: error.code === "23503" ? "This notice could not be saved." : "Maintenance could not be saved. Check the schedule and try again." }, 400);
    return json({ item: data });
  }

  if (input.kind === "blog") {
    const title = text(input.title, 180);
    const subtitle = text(input.subtitle, 320);
    const category = text(input.category, 80);
    const body = text(input.body, 50000);
    const rawSlug = typeof input.slug === "string" && input.slug.trim() ? input.slug.trim() : title ?? "";
    const slug = slugify(rawSlug);
    const status = typeof input.status === "string" ? input.status : "";
    if (!title || !subtitle || !category || !body || !slug || !postStates.has(status)) {
      return json({ error: "Add a title, subtitle, category, article text, and publishing state." }, 400);
    }
    const builtIn = builtInArticles.some(article => article.slug === slug);
    if (builtIn) return json({ error: "That URL is already used by a Field Notes article." }, 409);
    const publishedAt = status === "published"
      ? (typeof input.publishedAt === "string" && Number.isFinite(Date.parse(input.publishedAt)) ? new Date(input.publishedAt).toISOString() : new Date().toISOString())
      : null;
    const values = {
      title, subtitle, category, body, slug, status, published_at: publishedAt, updated_at: new Date().toISOString(),
      ...(update ? {} : { created_by_email: user.email ?? null }),
    };
    const query = update
      ? admin.from("tic_blog_posts").update(values).eq("id", id)
      : admin.from("tic_blog_posts").insert(values);
    const { data, error } = await query.select("id,slug,title,subtitle,category,body,status,published_at,created_at,updated_at").single();
    if (error) return json({ error: error.code === "23505" ? "That article URL is already in use." : "Field Notes could not be saved. Check the fields and try again." }, 400);
    return json({ item: data });
  }

  return json({ error: "Choose maintenance or Field Notes content." }, 400);
}
