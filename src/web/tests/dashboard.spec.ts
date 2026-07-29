import { test, expect } from '@playwright/test';

test.describe('대시보드 레이아웃', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  /**
   * 이슈 #24("UI 간격 불일치") 회귀 방지.
   *
   * 이전 버전은 `toHaveClass(/gap-8/)` 로 클래스 문자열만 확인했다.
   * 그 방식은 클래스가 마크업에 붙어 있는지만 보고 실제로 적용되었는지는
   * 보지 않는다. 이슈 #48(Tailwind v4 에 v3 지시문)에서 드러났듯,
   * 클래스가 있어도 CSS 가 생성되지 않으면 간격은 0 이 된다.
   * 계산된 스타일을 확인해야 같은 유형의 버그를 잡을 수 있다.
   */
  test('그리드 간격과 카드 여백이 실제로 적용된다', async ({ page }) => {
    const grid = page.locator('.grid.grid-cols-3');
    await expect(grid).toBeVisible();

    const gap = await grid.evaluate((el) => parseFloat(getComputedStyle(el).gap));
    expect(gap).toBeGreaterThan(0);

    // 카드 내부 여백도 유틸리티가 생성되어야 값이 잡힌다.
    const cardPadding = await grid
      .locator('> div')
      .first()
      .evaluate((el) => parseFloat(getComputedStyle(el).paddingTop));
    expect(cardPadding).toBeGreaterThan(0);
  });

  /**
   * 이슈 #48 회귀 방지.
   * preflight 가 생성되지 않으면 button 이 body 폰트를 상속받지 못하고
   * 브라우저 기본값(Arial)으로 떨어진다.
   */
  test('폼 요소가 본문 폰트를 상속한다', async ({ page }) => {
    const bodyFont = await page.evaluate(() => getComputedStyle(document.body).fontFamily);
    const buttonFont = await page
      .locator('button')
      .first()
      .evaluate((el) => getComputedStyle(el).fontFamily);

    expect(bodyFont).toContain('Pretendard');
    expect(buttonFont).toBe(bodyFont);
  });

  test('KPI 행이 렌더되고 미수집 지표는 사유를 표시한다', async ({ page }) => {
    await expect(page.getByText('전체 리뷰 수')).toBeVisible();
    await expect(page.getByText('긍정률')).toBeVisible();
    await expect(page.getByText('부정률')).toBeVisible();

    // 값이 있는 지표
    await expect(page.getByText('1,716', { exact: true })).toBeVisible();

    // 아직 수집하지 않는 지표는 값을 지어내지 않고 사유를 보여준다.
    await expect(page.getByText('평점 수집 미구현')).toBeVisible();
    await expect(page.getByText('오너 콘솔 연동 필요')).toBeVisible();
  });

  test('시트 연동 상태가 표시된다', async ({ page }) => {
    // 조회 성공/실패 어느 쪽이든 상태를 숨기지 않아야 한다.
    await expect(page.getByText(/구글 시트 (연동|조회 실패)/)).toBeVisible();
  });
});

test.describe('뷰 이동', () => {
  const VIEWS = [
    { href: '/reviews', label: '리뷰 탐색' },
    { href: '/trends', label: '트렌드 분석' },
    { href: '/branches', label: '지점 관리' },
    { href: '/segments', label: '고객 세그먼트' },
    { href: '/insights', label: 'AI 추천' },
  ];

  for (const view of VIEWS) {
    test(`사이드바에서 ${view.label} 로 이동한다`, async ({ page }) => {
      await page.goto('/');

      const link = page.getByRole('link', { name: view.label, exact: true });
      await link.click();

      await expect(page).toHaveURL(new RegExp(`${view.href}$`));
      await expect(page.getByRole('heading', { name: view.label })).toBeVisible();

      // 현재 뷰가 사이드바에서 활성으로 표시되어야 한다.
      await expect(link).toHaveAttribute('aria-current', 'page');
    });
  }
});
