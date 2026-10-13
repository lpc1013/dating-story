// tests-smoke/smoke.spec.js — 浏览器行为冒烟测试
// 覆盖：启动页渲染、全局无未捕获异常、进入游戏、工具抽屉开合（P2-01）。
import { test, expect } from '@playwright/test';

/** 进入游戏：点击「开始约会」按钮并等待顶栏出现 */
async function enterGame(page) {
  await page.goto('/');
  await page.locator('.start-btn').first().click();
  await expect(page.locator('.tool-drawer-btn')).toBeVisible({ timeout: 8000 });
}

test('启动页正常渲染', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#start-screen')).toBeVisible();
  await expect(page.locator('.start-title')).toContainText('恋爱约会');
  // 天气/难度选择器存在
  await expect(page.locator('.weather-btn')).toHaveCount(4);
  await expect(page.locator('.diff-btn')).toHaveCount(4);
});

test('页面加载无未捕获 JS 异常', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await page.waitForTimeout(500);
  expect(errors, `页面抛出了未捕获异常: ${errors.join(' | ')}`).toEqual([]);
});

test('进入游戏后工具抽屉可开合且收纳 5 项功能（P2-01）', async ({ page }) => {
  await enterGame(page);
  const btn = page.locator('.tool-drawer-btn');
  await btn.click();
  await expect(page.locator('#tool-drawer')).toHaveClass(/show/);
  await expect(page.locator('.tool-item')).toHaveCount(5);
  // 点击抽屉外区域自动收起
  await page.locator('.title').click();
  await expect(page.locator('#tool-drawer')).not.toHaveClass(/show/);
});

test('工具抽屉可打开「我的成就」面板', async ({ page }) => {
  await enterGame(page);
  await page.locator('.tool-drawer-btn').click();
  await page.locator('.tool-item', { hasText: '我的成就' }).click();
  await expect(page.locator('#achievements-panel')).toHaveClass(/show/);
});

test('顶栏已收敛为单一工具入口（无散落 hdr-ico 功能图标）', async ({ page }) => {
  await enterGame(page);
  // 顶栏内不应再出现直接绑定成就/相册/商店等功能的 hdr-ico（已移入抽屉）
  const directFn = await page.locator('.hdr-ico[onclick^="showAchievements"], .hdr-ico[onclick^="showAlbum"], .hdr-ico[onclick^="showGiftShop"], .hdr-ico[onclick^="showLoveTips"], .hdr-ico[onclick^="showSettings"]').count();
  expect(directFn).toBe(0);
});
