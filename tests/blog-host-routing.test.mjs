import test from "node:test";
import assert from "node:assert/strict";
import { resolveServiceHostRoute } from "../lib/tic/service-host-routing.ts";

test("the blog hostname maps its root and article slugs to the isolated blog routes", () => {
  assert.deepEqual(resolveServiceHostRoute("blogs.tidelight.app", "/"), { kind: "rewrite", pathname: "/blog" });
  assert.deepEqual(resolveServiceHostRoute("blogs.tidelight.app", "/getting-started-with-tidelight-packages"), { kind: "rewrite", pathname: "/blog/getting-started-with-tidelight-packages" });
  assert.equal(resolveServiceHostRoute("blogs.tidelight.app", "/blog/one-intelligence-layer-many-workflows"), null);
});

test("the blog hostname keeps shared assets on their original paths", () => {
  for (const path of ["/icon.svg", "/tidelight-mark.svg", "/manifest.webmanifest", "/tidelight-social.png", "/_next/static/chunk.js", "/cover.webp"]) {
    assert.equal(resolveServiceHostRoute("blogs.tidelight.app", path), null);
  }
});
