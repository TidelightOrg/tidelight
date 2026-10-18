import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { articles } from "./articles";
import "./blog.css";

export const metadata: Metadata = {
  title: { absolute: "Field Notes — Tidelight" },
  description: "Product notes, developer guides, and ideas from across the Tidelight ecosystem.",
  alternates: { canonical: "https://blogs.tidelight.app" },
  openGraph: { title: "Field Notes — Tidelight", description: "Product notes, developer guides, and ideas from across the Tidelight ecosystem.", url: "https://blogs.tidelight.app", siteName: "Tidelight", type: "website" },
};

export default function BlogHome() {
  const [featured, ...latest] = articles;
  return <main className="tl-blog">
    <nav className="tl-blog-nav" aria-label="Main navigation"><Link href="https://tidelight.app" className="tl-blog-brand"><Image src="/tidelight-mark.svg" alt="" width={30} height={30}/><span>Tidelight</span><i/>Field Notes</Link><div><Link href="#latest">Stories</Link><Link href="https://tidelight.app/developers">Developers</Link><Link className="tl-blog-social" href="https://x.com/TidelightOrg" target="_blank" rel="noreferrer">Follow on X <span aria-hidden="true">↗</span></Link></div></nav>
    <section className="tl-blog-hero"><div className="tl-blog-hero-copy"><p className="tl-blog-eyebrow"><span/> NOTES FROM THE ECOSYSTEM</p><h1>Ideas for a clearer<br/><em>view of the signal.</em></h1><p className="tl-blog-intro">Product notes, developer guides, and thoughtful perspectives from Tidelight. Made for curious builders and careful market observers.</p><a className="tl-blog-scroll" href="#latest">Explore the journal <span>↓</span></a></div><aside className="tl-blog-hero-art" aria-label="Tidelight editorial mark"><div className="tl-blog-orbit tl-blog-orbit-a"/><div className="tl-blog-orbit tl-blog-orbit-b"/><span className="tl-blog-art-kicker">TIDELIGHT / FIELD NOTES</span><div className="tl-blog-art-core"><Image src="/tidelight-mark.svg" alt="" width={46} height={46}/><span>Clarity<br/>in context.</span></div><span className="tl-blog-art-caption">MARKETS · METHODS · MAKING</span></aside></section>
    <section className="tl-blog-feature" aria-labelledby="tl-blog-feature-title"><div className="tl-blog-feature-art"><span>01 / ECOSYSTEM</span><div className="tl-blog-feature-monogram">T<span>.</span></div><small>ONE CONNECTED ECOSYSTEM</small></div><article><p className="tl-blog-eyebrow">{featured.category} <i/> {featured.readTime}</p><h2 id="tl-blog-feature-title"><Link href={`/blog/${featured.slug}`}>{featured.title}</Link></h2><p>{featured.dek}</p><div className="tl-blog-story-meta"><time>{featured.date}</time><Link href={`/blog/${featured.slug}`}>Read the story <span>↗</span></Link></div></article></section>
    <section className="tl-blog-latest" id="latest"><div className="tl-blog-section-head"><div><p className="tl-blog-eyebrow">THE JOURNAL / 03</p><h2>Latest perspectives.</h2></div><span>Ideas for the work ahead <i>↘</i></span></div><div className="tl-blog-grid">{latest.map((article, index) => <article className="tl-blog-card" key={article.slug}><div className={`tl-blog-card-art art-${index + 2}`}><span>0{index + 2} / {article.category}</span><strong>{index === 0 ? "BUILD" : "SEE"}<i>{index === 0 ? "+" : "."}</i></strong><small>TIDELIGHT FIELD NOTES</small></div><div className="tl-blog-card-copy"><p className="tl-blog-eyebrow">{article.category} <i/> {article.readTime}</p><h3><Link href={`/blog/${article.slug}`}>{article.title}</Link></h3><p>{article.dek}</p><div className="tl-blog-story-meta"><time>{article.date}</time><Link href={`/blog/${article.slug}`} aria-label={`Read ${article.title}`}>Read <span>↗</span></Link></div></div></article>)}</div></section>
    <section className="tl-blog-newsletter"><p className="tl-blog-eyebrow">OCCASIONAL NOTES FROM TIDELIGHT</p><h2>Stay close to the signal.</h2><p>Follow Tidelight on X for product updates and new writing.</p><Link href="https://x.com/TidelightOrg" target="_blank" rel="noreferrer" className="tl-blog-button">Follow @TidelightOrg <span>↗</span></Link></section>
    <footer className="tl-blog-footer"><Link href="https://tidelight.app" className="tl-blog-brand"><Image src="/tidelight-mark.svg" alt="" width={26} height={26}/><span>Tidelight</span></Link><span>Independent thinking. Shared context.</span><div><Link href="https://tidelight.app/developers">Intelligence Cloud</Link><Link href="https://package.tidelight.app">Packages</Link><Link href="https://github.com/TidelightOrg/tidelight" target="_blank" rel="noreferrer">GitHub <span>↗</span></Link><Link href="https://x.com/TidelightOrg" target="_blank" rel="noreferrer">X <span>↗</span></Link></div></footer>
  </main>;
}
