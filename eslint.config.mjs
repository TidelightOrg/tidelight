import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import noNewComments from "./eslint/no-new-comments.mjs";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    plugins: {
      tidelight: {
        rules: {
          "no-new-comments": noNewComments,
        },
      },
    },
    rules: {
      "tidelight/no-new-comments": "error",
    },
  },
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "packages/*/dist/**",
    "sdk/typescript/dist/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
