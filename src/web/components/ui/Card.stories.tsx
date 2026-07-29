import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect } from 'storybook/test';
import { Card } from './Card';

const meta = {
  component: Card,
  tags: ['ai-generated'],
} satisfies Meta<typeof Card>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { 
    children: <div className="p-4">This is a card</div>,
    className: "w-64 h-32"
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByText(/this is a card/i)).toBeVisible();
  },
};

export const Elevated: Story = {
  args: { 
    children: <div className="p-4">Elevated Card</div>,
    elevation: 4,
    className: "w-64 h-32"
  }
};
