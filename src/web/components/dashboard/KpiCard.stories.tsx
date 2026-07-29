import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, within } from "storybook/test";
import { Inbox, MessageSquare, Star, ThumbsDown, ThumbsUp } from "lucide-react";

import { KpiCard } from "./KpiCard";

const meta = {
  title: "Dashboard/KpiCard",
  component: KpiCard,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  args: {
    icon: MessageSquare,
  },
  decorators: [
    (Story) => (
      <div className="w-64 bg-[var(--plane)] p-4">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof KpiCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithValue: Story = {
  args: {
    label: "전체 리뷰 수",
    value: "1,716",
    meta: "정제 완료 기준 (RULES §2.3)",
  },
};

export const WithUnit: Story = {
  args: {
    label: "긍정률",
    icon: ThumbsUp,
    value: "99",
    unit: "%",
    meta: "1,699건",
  },
};

export const Negative: Story = {
  args: {
    label: "부정률",
    icon: ThumbsDown,
    value: "1",
    unit: "%",
    meta: "17건",
  },
};

/**
 * 아직 수집하지 않는 지표. 값을 지어내지 않고 사유를 보여준다.
 * 운영 화면에서 평균 평점과 응답 필요 리뷰가 이 상태다.
 */
export const Pending: Story = {
  args: {
    label: "평균 평점",
    icon: Star,
    pending: "평점 수집 미구현",
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // 수치가 없는데 그럴듯한 숫자가 보이면 안 된다.
    await expect(canvas.getByText("평점 수집 미구현")).toBeVisible();
    await expect(canvas.getByText("—")).toBeVisible();
  },
};

export const PendingReplies: Story = {
  args: {
    label: "응답 필요 리뷰",
    icon: Inbox,
    pending: "오너 콘솔 연동 필요",
  },
};
