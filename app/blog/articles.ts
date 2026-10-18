export type BlogSection = { heading: string; paragraphs: string[]; bullets?: string[] };
export type BlogArticle = {
  slug: string;
  category: string;
  date: string;
  readTime: string;
  title: string;
  dek: string;
  sections: BlogSection[];
};

export const articles: BlogArticle[] = [
  {
    slug: "one-intelligence-layer-many-workflows",
    category: "ECOSYSTEM",
    date: "October 18, 2026",
    readTime: "4 min read",
    title: "One intelligence layer. Many developer workflows.",
    dek: "A clearer way to move between Tidelight Intelligence Cloud, official packages, and the market research desk.",
    sections: [
      { heading: "Different tools, shared foundations", paragraphs: ["Tidelight is an ecosystem of distinct products. The Intelligence Cloud gives developers a place to manage projects, credentials, usage, and integrations. The Packages experience helps teams discover official tools and bring them into the environments they already use. Tidelight is the market research desk where context and evidence come together.", "Each experience has its own landing page and dashboard. They share a visual language and account foundation while keeping their purpose clear."] },
      { heading: "Start where your work happens", paragraphs: ["Use the TypeScript SDK or Python client when your application needs a typed interface. Connect an MCP-compatible client when a remote tool workflow fits better. Use the console to manage projects and credentials, and the package dashboard to explore the integrations themselves.", "The package guides link back to the developer documentation and source so you can inspect how each integration works before adding it to a project."] },
      { heading: "A connected ecosystem should feel simple", paragraphs: ["System navigation is designed to make the destination explicit. From a package page, the package console opens the package dashboard; the ecosystem switcher provides a direct route back to Intelligence Cloud or Tidelight.", "We are continuing to refine the mobile experience so the same destinations and important actions remain easy to find on a small screen."] },
    ],
  },
  {
    slug: "getting-started-with-tidelight-packages",
    category: "BUILD WITH TIDELIGHT",
    date: "October 18, 2026",
    readTime: "5 min read",
    title: "A practical first step with Tidelight packages",
    dek: "Find an integration, inspect its source, and follow a version-pinned path into your stack.",
    sections: [
      { heading: "Choose the interface that fits", paragraphs: ["The official package directory brings together the TypeScript SDK, MCP integration, Python client, React package, and command-line tools. Start with the workflow that matches your application and runtime rather than adding every integration at once.", "Each package detail page explains its intended use, compatibility notes, registry destination, and available examples."] },
      { heading: "Check release details before installing", paragraphs: ["Package versions and installation instructions are surfaced alongside their registry links. Confirm the current release and follow the exact command shown on the package page. The public source repository remains available for review.", "Credentials belong in your server environment or an appropriate protected secret store. Avoid putting project keys in browser code, source control, or logs."] },
      { heading: "Keep access scoped", paragraphs: ["Tidelight project credentials have explicit permissions. Create a key for the integration that needs it, grant only the required scopes, and rotate or revoke it from the Intelligence Cloud console when access changes.", "Read the current documentation for endpoint behavior and availability before building a workflow that depends on a specific provider capability."] },
    ],
  },
  {
    slug: "source-led-market-context",
    category: "PRODUCT NOTES",
    date: "October 18, 2026",
    readTime: "3 min read",
    title: "Market context is more useful when its sources stay visible",
    dek: "The Tidelight method keeps events, evidence, exposure, and scenarios connected without hiding uncertainty.",
    sections: [
      { heading: "Follow the chain of context", paragraphs: ["A market event can matter for different reasons to different people. Tidelight organizes research around a simple sequence: Event, Evidence, Exposure, Scenario, Decision. It gives each step room to be inspected instead of flattening the work into a single confident-sounding answer."] },
      { heading: "Keep observations and interpretation distinct", paragraphs: ["Sources have dates and publisher context where available. Market observations, sourced claims, model inference, and a user's own decision are different things and should remain distinguishable.", "Coverage and freshness depend on the providers and sources available for a given request. When a capability is unavailable, the interface should say so rather than imply that current information was retrieved."] },
      { heading: "The final decision stays with you", paragraphs: ["Tidelight can help organize research and surface questions worth considering. It does not make the user's decision, and current workflows do not place live orders. Review source material and relevant risk before acting."] },
    ],
  },
];

export function articleBySlug(slug: string) {
  return articles.find((article) => article.slug === slug);
}
