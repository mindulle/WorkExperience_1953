import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, userEvent, within } from "storybook/test";
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

/**
 * 이슈 #19("드롭다운 메뉴 렌더링 오류") 회귀 방지.
 *
 * 원래 E2E(tests/dashboard.spec.ts 의 [CEO-637])에 있었으나, 대시보드에서
 * Select 가 표시용 chip 으로 대체되면서 페이지에 존재하지 않게 되었다.
 * 드롭다운이 Portal 로 열리고 선택이 반영되는지는 페이지가 아니라
 * 컴포넌트의 관심사이므로 스토리로 옮긴다.
 */
export const OpensAndSelects: Story = {
  render: () => {
    const [selected, setSelected] = useState("all");
    return (
      <Select options={options} selected={selected} onSelect={setSelected} className="w-48" />
    );
  },
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    const trigger = canvas.getByRole("button");

    await step("초기 선택값이 표시된다", async () => {
      await expect(trigger).toHaveTextContent("전체 지점");
    });

    await step("트리거를 누르면 메뉴가 Portal 로 열린다", async () => {
      await userEvent.click(trigger);
      // Portal 로 렌더되므로 canvasElement 밖(document.body)에서 찾는다.
      const menu = await within(document.body).findByRole("menu");
      await expect(menu).toBeVisible();
    });

    await step("옵션을 고르면 트리거 라벨이 바뀐다", async () => {
      const option = within(document.body).getByRole("menuitem", { name: "광안점" });
      await userEvent.click(option);
      await expect(trigger).toHaveTextContent("광안점");
    });
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
