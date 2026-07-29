// For more info, see https://github.com/storybookjs/eslint-plugin-storybook#configuration-flat-config-format
import storybook from "eslint-plugin-storybook";

import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // 빌드 산출물과 로컬 캐시. 압축된 번들까지 검사하면 문제가 1만 건 넘게 잡힌다.
    "storybook-static/**",
    "playwright-report/**",
    "test-results/**",
    ".wrangler/**",
  ]),
  ...storybook.configs["flat/recommended"]
]);

export default eslintConfig;
