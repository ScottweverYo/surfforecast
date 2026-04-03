import { test, expect } from '@playwright/test';

const FORECAST_TEXT =
	'Vrijdag heuphoog met zuidwest 4bft offshore. Schev goed tot 10u.';

test.describe('Clipboard Paste Button (US1)', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/');
		await page.evaluate(() => localStorage.removeItem('expert_messages'));
	});

	test('paste button is visible on localhost (secure context)', async ({ page }) => {
		await expect(page.locator('.clipboard-paste-btn')).toBeVisible();
	});

	test('pasting valid forecast text adds entry and shows toast', async ({
		page,
		context
	}) => {
		await context.grantPermissions(['clipboard-read', 'clipboard-write']);
		await page.evaluate(
			(text) => navigator.clipboard.writeText(text),
			FORECAST_TEXT
		);

		await page.locator('.clipboard-paste-btn').click();

		await expect(page.locator('.toast-content')).toBeVisible();

		const stored = await page.evaluate(() => localStorage.getItem('expert_messages'));
		const messages = JSON.parse(stored ?? '[]');
		expect(messages).toHaveLength(1);
		expect(messages[0].rawText).toBe(FORECAST_TEXT);
	});

	test('Ongedaan maken removes message and hides toast', async ({ page, context }) => {
		await context.grantPermissions(['clipboard-read', 'clipboard-write']);
		await page.evaluate(
			(text) => navigator.clipboard.writeText(text),
			FORECAST_TEXT
		);

		await page.locator('.clipboard-paste-btn').click();
		await expect(page.locator('.toast-content')).toBeVisible();

		await page.locator('.toast-content button', { hasText: 'Ongedaan maken' }).click();

		await expect(page.locator('.toast-content')).not.toBeVisible();
		const stored = await page.evaluate(() => localStorage.getItem('expert_messages'));
		const messages = JSON.parse(stored ?? '[]');
		expect(messages).toHaveLength(0);
	});

	test('short clipboard text shows warning, no ingestion', async ({ page, context }) => {
		await context.grantPermissions(['clipboard-read', 'clipboard-write']);
		await page.evaluate(() => navigator.clipboard.writeText('te kort'));

		await page.locator('.clipboard-paste-btn').click();

		await expect(page.locator('.paste-warning')).toBeVisible();
		await expect(page.locator('.paste-warning')).toContainText('geen voorspelling');

		const stored = await page.evaluate(() => localStorage.getItem('expert_messages'));
		const messages = JSON.parse(stored ?? '[]');
		expect(messages).toHaveLength(0);
	});

	test('empty clipboard shows warning "Klembord is leeg"', async ({ page, context }) => {
		await context.grantPermissions(['clipboard-read', 'clipboard-write']);
		await page.evaluate(() => navigator.clipboard.writeText(''));

		await page.locator('.clipboard-paste-btn').click();

		await expect(page.locator('.paste-warning')).toContainText('Klembord is leeg');
	});

	test('button is disabled while undo toast is visible', async ({ page, context }) => {
		await context.grantPermissions(['clipboard-read', 'clipboard-write']);
		await page.evaluate(
			(text) => navigator.clipboard.writeText(text),
			FORECAST_TEXT
		);

		await page.locator('.clipboard-paste-btn').click();
		await expect(page.locator('.toast-content')).toBeVisible();

		await expect(page.locator('.clipboard-paste-btn')).toBeDisabled();
	});
});
