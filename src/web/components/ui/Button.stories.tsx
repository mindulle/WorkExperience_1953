import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect } from 'storybook/test';
import { Button } from './Button';

const meta = {
  component: Button,
  tags: ['ai-generated'],
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = {
  args: { children: 'Submit Button' },
  play: async ({ canvas }) => {
    const button = canvas.getByRole('button', { name: /submit button/i });
    await expect(button).toBeVisible();
  },
};

export const Disabled: Story = {
  args: { children: 'Disabled Button', disabled: true },
};

export const CssCheck: Story = {
  args: { children: 'Submit' },
  play: async ({ canvas }) => {
    // checking if body has Pretendard font loaded via global css (smoke test)
    const button = canvas.getByRole('button', { name: /submit/i });
    const computedFont = getComputedStyle(button).fontFamily;
    await expect(computedFont).toContain('Pretendard');
  },
};
