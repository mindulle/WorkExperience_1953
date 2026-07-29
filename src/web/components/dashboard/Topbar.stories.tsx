import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, within } from "storybook/test";

import { Topbar } from "./Topbar";

const meta = {
  title: "Dashboard/Topbar",
  component: Topbar,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
  args: {
    updatedAt: "2026. 7. 29. 오후 8:18",
  },
  decorators: [
    // Topbar 는 -mx-6 px-6 으로 부모의 p-6 을 상쇄한다. 레이아웃과 같은
    // 여백을 가진 컨테이너 안에 넣어야 실제 화면과 같은 폭으로 보인다.
    (Story) => (
      <div className="bg-[var(--plane)] p-6 min-h-[220px]">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Topbar>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 구글 시트 조회 성공. 운영 화면의 정상 상태다. */
export const SheetConnected: Story = {
  args: {
    source: "sheet",
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText(/구글 시트 연동/)).toBeVisible();
  },
};

/**
 * 시트 조회 실패로 기본값이 쓰인 상태.
 *
 * 기본값(80% / 20%)은 실제 정제 결과(99% / 1%)와 다르므로, 화면이
 * 이를 실제 값처럼 보여주면 안 된다. 상태 표시줄이 실패를 드러내는지
 * 확인하기 위한 스토리다. 실제 환경에서는 시트 조회를 실패시켜야만
 * 볼 수 있어 재현이 번거롭다.
 */
export const SheetUnavailable: Story = {
  args: {
    source: "fallback",
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText(/구글 시트 조회 실패/)).toBeVisible();
    await expect(canvas.getByText(/기본값 표시 중/)).toBeVisible();
  },
};
