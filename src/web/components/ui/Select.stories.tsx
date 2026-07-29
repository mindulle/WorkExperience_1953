import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { Select } from "./Select";

const meta: Meta<typeof Select> = {
  title: "UI/Select",
  component: Select,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof Select>;

const options = [
  { value: "all", label: "전체 지점" },
  { value: "main", label: "경성대본점" },
  { value: "gwangan", label: "광안점" },
];

export const Default: Story = {
  render: () => {
    const [selected, setSelected] = useState("all");
    return (
      <Select
        options={options}
        selected={selected}
        onSelect={setSelected}
        className="w-48"
      />
    );
  },
};

export const Unselected: Story = {
  args: {
    options,
    className: "w-48",
  },
};

export const ChannelSelect: Story = {
  render: () => {
    const [selected, setSelected] = useState("all");
    return (
      <Select
        options={[
          { value: "all", label: "통합 (네이버+유튜브)" },
          { value: "naver", label: "네이버 리뷰" },
          { value: "youtube", label: "유튜브 댓글" },
        ]}
        selected={selected}
        onSelect={setSelected}
        className="w-56"
      />
    );
  },
};
