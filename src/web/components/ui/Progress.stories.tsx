import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Progress } from "./Progress";

const meta: Meta<typeof Progress> = {
  title: "UI/Progress",
  component: Progress,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    value: {
      control: { type: "range", min: 0, max: 100, step: 1 },
    },
  },
};

export default meta;
type Story = StoryObj<typeof Progress>;

export const Default: Story = {
  args: {
    value: 65,
    className: "w-72",
  },
};

export const WithLabel: Story = {
  args: {
    value: 78,
    label: "긍정 리뷰 비율",
    className: "w-72",
  },
};

export const Low: Story = {
  args: {
    value: 20,
    label: "부정 리뷰",
    className: "w-72",
  },
};

export const Full: Story = {
  args: {
    value: 100,
    label: "완료",
    className: "w-72",
  },
};

export const Empty: Story = {
  args: {
    value: 0,
    label: "데이터 없음",
    className: "w-72",
  },
};
