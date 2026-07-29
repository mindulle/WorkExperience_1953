import type { StorybookConfig } from '@storybook/nextjs-vite';

const config: StorybookConfig = {
  "stories": [
    "../stories/**/*.mdx",
    "../stories/**/*.stories.@(js|jsx|mjs|ts|tsx)",
    // 실제 디자인 시스템 스토리는 components/ 에 있다.
    // 이 경로가 빠져 있으면 Chromatic 이 설치 예제만 검증하게 된다.
    "../components/**/*.stories.@(js|jsx|mjs|ts|tsx)"
  ],
  "addons": [
    "@chromatic-com/storybook",
    "@storybook/addon-vitest",
    "@storybook/addon-a11y",
    "@storybook/addon-docs",
    "@storybook/addon-mcp"
  ],
  "framework": "@storybook/nextjs-vite",
  "staticDirs": [
    "../public",
    // 팀원 제공 프로토타입을 Storybook에서만 서빙한다.
    // public/ 이 아닌 docs/design/ 에 두어 배포물(out/)에는 포함되지 않는다.
    { "from": "../../../docs/design", "to": "/design" }
  ]
};
export default config;