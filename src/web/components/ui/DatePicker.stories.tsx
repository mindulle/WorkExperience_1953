import type { Meta, StoryObj } from "@storybook/react";
import { DatePicker } from "./DatePicker";

const meta: Meta<typeof DatePicker> = {
  title: "UI/DatePicker",
  component: DatePicker,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof DatePicker>;

export const Default: Story = {
  args: {
    className: "w-64",
  },
};

export const WithLabel: Story = {
  args: {
    label: "시작일",
    className: "w-64",
  },
};

export const WithValue: Story = {
  args: {
    label: "종료일",
    value: "2026-07-29",
    className: "w-64",
  },
};

export const StartAndEnd: Story = {
  render: () => (
    <div className="flex flex-col gap-4 w-64">
      <DatePicker label="시작일" value="2026-07-01" />
      <DatePicker label="종료일" value="2026-07-29" />
    </div>
  ),
};
