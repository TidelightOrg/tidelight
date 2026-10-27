import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("landing use-case directory keeps its four research disciplines and direct editable-question entry", async () => {
  const source = await read("../app/ui/landing-use-cases.tsx");
  assert.match(source, /const categoryGroups = categories\.slice\(1\)/);
  for (const category of ["Company events", "Tokenized markets", "Macro context", "Decision workflows"]) {
    assert.ok(source.includes(`"${category}"`), `missing research category: ${category}`);
  }
  assert.ok(source.includes("/flow?question="));
  assert.ok(source.includes("encodeURIComponent(translate(item.question))"));
  assert.match(source, /aria-live="polite"/);
});

test("mobile use-case navigation follows the grouped directory and localizes its labels", async () => {
  const menu = await read("../app/ui/landing-use-case-menu-links.tsx");
  const page = await read("../app/ui/landing-page.tsx");
  assert.match(page, /<LandingUseCaseMenuLinks\s*\/>/);
  assert.match(menu, /useLanguage\(\)/);
  assert.match(menu, /#use-case-group-\$\{index\}/);
  assert.match(menu, /tidelight:reveal-use-cases/);
  assert.match(menu, /scrollIntoView/);
  assert.match(menu, /公司事件/);
  assert.match(menu, /决策流程/);
  assert.match(menu, /aria-label=\{t\("Use case categories"/);
  const useCases = await read("../app/ui/landing-use-cases.tsx");
  assert.match(useCases, /tidelight:reveal-use-cases/);
  assert.doesNotMatch(useCases, /<span className=\{styles\.cardCategory\}>/);
});

test("shared signature footer exposes real research, developer, package, and trust destinations", async () => {
  const footer = await read("../app/ui/tidelight-signature-footer.tsx");
  const styles = await read("../app/ui/tidelight-signature-footer.module.css");
  for (const href of ["https://tidelight.app/research", "https://tidelight.app/markets", "https://tidelight.app/nightwatch", "https://dev.tidelight.app/", "https://tidelight.app/developers/console", "https://package.tidelight.app/", "https://tidelight.app/judge", "https://status.tidelight.app/"]) {
    assert.ok(footer.includes(href), `missing direct footer destination: ${href}`);
  }
  assert.match(footer, /<svg viewBox="0 0 520 210"/);
  assert.match(styles, /data-theme="white"/);

  assert.match(styles, /prefers-reduced-motion:reduce/);
  assert.match(styles, /@media\(max-width:700px\)/);
  const useCaseStyles = await read("../app/ui/landing-use-cases.module.css");
  assert.match(useCaseStyles, /data-path-count="3"/);
  assert.match(useCaseStyles, /data-path-count="2"/);
  assert.match(useCaseStyles, /@media\(max-width:520px\)/);
  assert.match(styles, /:global\(\.tic-packages-page\) \.directory\{display:grid/);
});
