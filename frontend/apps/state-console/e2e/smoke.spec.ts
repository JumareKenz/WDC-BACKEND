import { test, expect } from '@playwright/test';

test.describe('State Console smoke tests', () => {
  test('Dashboard renders', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('text=Kaduna State')).toBeVisible();
  });

  test('Submissions page renders', async ({ page }) => {
    await page.goto('/submissions');
    await expect(page.locator('text=Submissions Queue')).toBeVisible();
  });

  test('Investigations page renders', async ({ page }) => {
    await page.goto('/investigations');
    await expect(page.locator('text=Investigations')).toBeVisible();
  });

  test('Users page renders', async ({ page }) => {
    await page.goto('/users');
    await expect(page.locator('text=User Management')).toBeVisible();
  });

  test('Forms page renders', async ({ page }) => {
    await page.goto('/forms');
    await expect(page.locator('text=Form Builder')).toBeVisible();
  });

  test('Messages page renders', async ({ page }) => {
    await page.goto('/messages');
    await expect(page.locator('text=Broadcast Messages')).toBeVisible();
  });

  test('Audit page renders', async ({ page }) => {
    await page.goto('/audit');
    await expect(page.locator('text=Audit Log')).toBeVisible();
  });

  test('Analytics page renders', async ({ page }) => {
    await page.goto('/analytics');
    await expect(page.locator('text=Analytics')).toBeVisible();
  });

  test('AI Assistant page renders', async ({ page }) => {
    await page.goto('/ai');
    await expect(page.locator('text=AI Assistant')).toBeVisible();
  });

  test('Settings page renders', async ({ page }) => {
    await page.goto('/settings');
    await expect(page.locator('text=Settings')).toBeVisible();
  });

  test('LGA drilldown renders', async ({ page }) => {
    await page.goto('/lga/lga-1');
    await expect(page.locator('text=LGA Overview')).toBeVisible();
  });
});
