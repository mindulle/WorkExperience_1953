import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, within } from "storybook/test";

import { RefreshButton } from "./RefreshButton";

const meta = {
  title: "Dashboard/RefreshButton",
  component: RefreshButton,
  tags: ["ai-generated"],
} satisfies Meta<typeof RefreshButton>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 기본 상태. 트리거 서버 설정 여부와 무관하게 버튼은 항상 보인다. */
export const Idle: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("button", { name: /데이터 갱신/ })).toBeVisible();
  },
};

/**
 * 트리거 서버(#164, 별도 백엔드)가 아직 구성되지 않은 환경(Storybook 등)에서
 * 클릭했을 때 명확한 안내 메시지를 보여주는지 확인한다.
 */
export const NotConfigured: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const button = canvas.getByRole("button", { name: /데이터 갱신/ });
    await button.click();
    await expect(
      canvas.getByText(/트리거 서버 주소가 아직 설정되지 않았습니다/)
    ).toBeVisible();
  },
};
