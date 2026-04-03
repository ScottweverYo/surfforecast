import { test, expect } from '@playwright/test';

const FORECAST_TEXT =
	'Vrijdag heuphoog met zuidwest 4bft offshore. Schev goed tot 10u.';

test.describe('Share Target (US1)', () => {
	test.beforeEach(async ({ page }) => {
		// Clear localStorage before each test
		await page.goto('/');
		await page.evaluate(() => localStorage.removeItem('expert_messages'));
	});

	test('navigating to /share-target with text redirects to /', async ({ page }) => {
		await page.goto(
			`/share-target?text=${encodeURIComponent(FORECAST_TEXT)}`
		);
		await expect(page).toHaveURL('/');
	});

	test('undo toast is visible after share', async ({ page }) => {
		await page.goto(
			`/share-target?text=${encodeURIComponent(FORECAST_TEXT)}`
		);
		await expect(page.locator('.toast-content')).toBeVisible();
	});

	test('expert message is added to localStorage', async ({ page }) => {
		await page.goto(
			`/share-target?text=${encodeURIComponent(FORECAST_TEXT)}`
		);
		await page.waitForURL('/');

		const stored = await page.evaluate(() => localStorage.getItem('expert_messages'));
		const messages = JSON.parse(stored ?? '[]');
		expect(messages).toHaveLength(1);
		expect(messages[0].rawText).toBe(FORECAST_TEXT);
	});

	test('Ongedaan maken removes message and hides toast', async ({ page }) => {
		await page.goto(
			`/share-target?text=${encodeURIComponent(FORECAST_TEXT)}`
		);
		await expect(page.locator('.toast-content')).toBeVisible();

		await page.locator('.toast-content button', { hasText: 'Ongedaan maken' }).click();

		await expect(page.locator('.toast-content')).not.toBeVisible();

		const stored = await page.evaluate(() => localStorage.getItem('expert_messages'));
		const messages = JSON.parse(stored ?? '[]');
		expect(messages).toHaveLength(0);
	});

	test('navigating to /share-target with no text redirects to / without toast', async ({
		page
	}) => {
		await page.goto('/share-target');
		await expect(page).toHaveURL('/');
		await expect(page.locator('.toast-content')).not.toBeVisible();
	});
});
