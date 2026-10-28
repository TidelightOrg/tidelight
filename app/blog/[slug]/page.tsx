import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { articleBySlug, articles } from "../articles";
import { getBlogArticleBySlug, getPublishedBlogArticles } from "@/lib/tic/editorial-content";
import "../blog.css";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  let article = articleBySlug(slug);
  if (!article) { try { article = await getBlogArticleBySlug(slug) ?? null; } catch { article = null; } }
  if (!article) return { title: "Story not found — Tidelight" };
  const url = `https://blogs.tidelight.app/blog/${article.slug}`;
  return {
    title: { absolute: `${article.title} — Tidelight Field Notes` },
    description: article.dek,
    alternates: { canonical: url },
    openGraph: { title: article.title, description: article.dek, url, siteName: "Tidelight Field Notes", type: "article", publishedTime: new Date(article.date).toISOString() },
  };
}

export default async function BlogArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  let article = articleBySlug(slug);
  if (!article) { try { article = await getBlogArticleBySlug(slug) ?? null; } catch { article = null; } }
  if (!article) notFound();
  let published: typeof articles = [];
  try { published = await getPublishedBlogArticles(); } catch { /* Keep built-in related stories available if the store is unavailable. */ }
  const allArticles = [...published, ...articles.filter(item => !published.some(post => post.slug === item.slug))];
  const relatedArticles = allArticles.filter((item) => item.slug !== article.slug).slice(0, 2);
  return <main className="tl-blog tl-blog-reading">
    <nav className="tl-blog-nav" aria-label="Main navigation"><Link href="https://blogs.tidelight.app" className="tl-blog-brand"><Image src="/tidelight-mark.svg" alt="" width={30} height={30}/><span>Tidelight</span><i/>Field Notes</Link><div><Link href="https://blogs.tidelight.app/#latest">Stories</Link><Link href="https://tidelight.app/developers">Developers</Link><Link className="tl-blog-social" href="https://x.com/TidelightOrg" target="_blank" rel="noreferrer">Follow on X <span aria-hidden="true">↗</span></Link></div></nav>
    <header className="tl-article-hero"><Link href="https://blogs.tidelight.app" className="tl-article-back">← Field Notes</Link><p className="tl-blog-eyebrow">{article.category} <i/> {article.readTime}</p><h1>{article.title}</h1><p>{article.dek}</p><time>{article.date}</time></header>
    <div className="tl-article-art" aria-hidden="true"><span>FIELD NOTES / TIDELIGHT</span><div><Image src="/tidelight-mark.svg" alt="" width={60} height={60}/><strong>Context<br/>changes everything.</strong></div><small>EVENT → EVIDENCE → EXPOSURE → SCENARIO</small></div>
    <article className="tl-article-body">{article.sections.map((section) => <section key={section.heading}><h2>{section.heading}</h2>{section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}{section.bullets ? <ul>{section.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}</ul> : null}</section>)}<aside className="tl-article-end"><span>CONTINUE EXPLORING</span><Link href="https://tidelight.app/developers">Visit Intelligence Cloud <b>↗</b></Link><Link href="https://package.tidelight.app">Explore Packages <b>↗</b></Link></aside><section className="tl-article-related" aria-labelledby="tl-article-related-title"><div className="tl-article-related-head"><div><span>THE JOURNAL</span><h2 id="tl-article-related-title">More Field Notes</h2></div><Link href="https://blogs.tidelight.app">All stories <b aria-hidden="true">↗</b></Link></div><div className="tl-article-related-grid">{relatedArticles.map((item, index) => <Link className={`tl-article-related-card tl-article-related-card-${index + 1}`} href={`/blog/${item.slug}`} key={item.slug}><span>{item.category} <i/> {item.readTime}</span><strong>{item.title}</strong><small>{item.dek}</small><b aria-hidden="true">↗</b></Link>)}</div></section></article>
    <footer className="tl-blog-footer"><Link href="https://tidelight.app" className="tl-blog-brand"><Image src="/tidelight-mark.svg" alt="" width={26} height={26}/><span>Tidelight</span></Link><span>Independent thinking. Shared context.</span><div><Link href="https://blogs.tidelight.app">All stories</Link><Link href="https://github.com/TidelightOrg/tidelight" target="_blank" rel="noreferrer">GitHub <span>↗</span></Link><Link href="https://x.com/TidelightOrg" target="_blank" rel="noreferrer">X <span>↗</span></Link></div></footer>
  </main>;
}
