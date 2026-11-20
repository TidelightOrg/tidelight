# ADR 0010: A few layout rules exist because the viewport lies

## Status

Accepted

## Context

Sticky headers, phone browsers in desktop-site mode, and fixed docks create constraints that the component structure does not show. Those constraints are recorded here.

## Decision

- Balance the five-card desktop directory; tablet and mobile keep their natural flow. (`app/developers/packages/packages.css`)
- Keep the interactive source preview legible under the shared .tic pre defaults. (`app/developers/packages/packages.css`)
- Keep detail content clear of the mobile package dock. (`app/developers/packages/packages.css`)
- Keep package landing and dashboard content above the fixed mobile systems dock. (`app/developers/packages/packages.css`)
- Keep the package hero readable when mobile browsers request the desktop site. (`app/developers/packages/packages.css`)
- WCAG AA text contrast for the warm daylight palette. Brand teal remains in decorative surfaces. (`app/developers/platform-polish.css`)
- Signed-out developer console: useful orientation without implying sample account activity. (`app/developers/platform-polish.css`)
- A phone in desktop-site mode can report a 980px CSS width. Switch navigation before the full desktop links and the brand label start colliding. (`app/developers/platform-polish.css`)
- Compact the shared developer navigation when a desktop site is shown in a tablet viewport. (`app/developers/platform-polish.css`)
- Responsive research hero: keep suggestions inside the card and give narrow layouts a clear visual anchor. (`app/flow/flow.css`)
- Selective glass surfaces: highlight live context and compact controls while keeping the larger workstation panels calm and opaque for readability. (`app/futures/paper.css`)
- Research source dialog shares the active workspace palette. Keep these scoped so third-party/editor styles cannot force a dark card into the milk theme. (`app/globals.css`)
- Keep the four overview tokens in a balanced two-by-two radar at every width. (`app/globals.css`)
- Preserve the requested two-by-two company radar against narrow-screen stack defaults. (`app/globals.css`)
- Phone browsers in desktop-site mode keep a desktop CSS width while shrinking the page to fit. (`app/globals.css`)
- Keep the provider health breakdown's five metrics on one readable row. (`app/globals.css`)
- Keep shared floating helpers from covering evidence headings and media controls. (`app/judge/judge.css`)
- Give the public walkthrough a quiet cinematic frame without covering its controls. (`app/judge/judge.css`)
- Keep judge evidence readable at phone-sized desktop-site widths. (`app/judge/judge.css`)
- The landing header shares the workspace theme controls without changing them there. (`app/landing.css`)
- Keep the mobile navigation panel inside the viewport instead of anchoring it to the narrow menu disclosure (which can push it off-screen). (`app/landing.css`)
- `hidden` creates a scrolling ancestor that prevents viewport sticky headers from sticking on mobile. Clip horizontal overflow without capturing vertical page scrolling. (`app/mobile-polish.css`)
- landing.css declares overflow:hidden for artwork clipping; that creates a scroll container and disables the sticky public masthead. (`app/mobile-polish.css`)
- A shared glass finish for compact information cards and useful sub-cards. Large reading, form, and data-table panels keep their calmer solid surfaces. (`app/mobile-polish.css`)
- The overview radar stays a compact two-by-two even below the global stack breakpoint. (`app/mobile-polish.css`)
- Keep the Bitget universe in a compact desktop-style grid on phones. (`app/mobile-polish.css`)
- Floating and expanded surfaces use the same refracted glass as the masthead. Keep the content layer translucent too, so the card beneath remains visible. (`app/mobile-polish.css`)
- The overlay is a positioning/click-dismiss layer only; leave the page vivid. (`app/mobile-polish.css`)
- Keep overview labels readable when a phone requests desktop-site layout. (`app/overview/intelligent-overview.css`)
- Keep keyboard navigation easy to locate without changing pointer styling. (`app/product-design-polish.css`)
- Honor platform contrast preferences with stronger supporting text and borders. (`app/product-design-polish.css`)
- Avoid nonessential movement for people who ask the system to reduce motion. (`app/product-design-polish.css`)
- Preserve the bright developer accent for fills while using a darker companion color for text on the light package catalog. (`app/product-design-polish.css`)
- The mobile landing hero already has its own research entry point and trust row. (`app/product-quick-actions.css`)
- Public replays follow the viewer's saved Tidelight theme. (`app/replay/[token]/shared-replay.css`)
- Keep the glass surface legible over busy product pages and avoid duplicate Tide labels while open. (`app/support-companion.css`)
- Keep the navigation as the flexible, scrollable region on short desktop viewports so the research promo and account controls never get clipped. (`app/theme-polish.css`)
- Liquid glass for interface chrome: keep content panels opaque and calm. (`app/theme-polish.css`)
- Shared workspace typography and card treatment. Status borders retain their semantic colours. (`app/theme-polish.css`)

## Consequences

Code no longer repeats these constraints. Change the behavior only by updating this record and the implementation together. Applied migrations under `supabase/migrations/` are not rewritten.
