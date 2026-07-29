import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { Input } from "./Input";

const meta: Meta<typeof Input> = {
  title: "UI/Input",
  component: Input,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof Input>;

export const Default: Story = {
  render: () => {
    const [value, setValue] = useState("");
    return (
      <Input
        value={value}
        onChange={setValue}
        placeholder="검색어를 입력하세요"
        className="w-72"
      />
    );
  },
};

export const WithValue: Story = {
  render: () => {
    const [value, setValue] = useState("경성대본점");
    return (
      <Input
        value={value}
        onChange={setValue}
        placeholder="지점명 입력"
        className="w-72"
      />
    );
  },
};

export const Disabled: Story = {
  args: {
    value: "비활성 입력",
    placeholder: "입력 불가",
    disabled: true,
    className: "w-72",
  },
};
