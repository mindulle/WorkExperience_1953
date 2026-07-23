import { test, expect } from '@playwright/test';

test.describe('Dashboard UI & Layout tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('[CEO-637] 드롭다운 메뉴가 올바른 UI 컴포넌트(Portal/Radix)로 렌더링되어야 한다', async ({ page }) => {
    // Select 컴포넌트가 마운트될 때까지 대기
    const dropdownTrigger = page.locator('button[role="combobox"]').first();
    
    try {
      await expect(dropdownTrigger).toBeVisible({ timeout: 10000 });
    } catch (e) {
      console.log("Body:", await page.innerHTML('body'));
      throw e;
    }

    // 드롭다운 열기
    await dropdownTrigger.waitFor({ state: 'visible' });
    await dropdownTrigger.click({ force: true });

    // Portal이 렌더링되며 역할이 menu인 요소가 DOM에 표시되는지 검증
    const menu = page.locator('[role="menu"]');
    await expect(menu).toBeVisible();

    // 옵션 클릭 확인 (ex: 광안점)
    const option = menu.locator('[role="menuitem"]', { hasText: '광안점' });
    await expect(option).toBeVisible();
    await option.click();
    
    // 버튼 텍스트가 변경되었는지 확인
    await expect(dropdownTrigger).toContainText('광안점');
  });

  test('[CEO-636] 메인 대시보드 그리드의 간격이 일관되게 렌더링되어야 한다', async ({ page }) => {
    // grid 레이아웃에 gap-8이 선언되어 있는지 검증 (Tailwind 스펙)
    const gridContainer = page.locator('.grid.grid-cols-3');
    
    await expect(gridContainer).toBeVisible();
    await expect(gridContainer).toHaveClass(/gap-8/);
  });
});
