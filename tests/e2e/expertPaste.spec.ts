import { test, expect } from '@playwright/test';

const APPENDIX_C = `Korte Samenvatting: vrijdag eerst swell, maar bijna (te) snel gaat het over in windgolven. Zaterdag minder wind en begint met 0,5m golven die steeds kleiner worden. Heel laat op de dag verschijnt er in N-H en wadden een nieuwe WNW swell.

Detailbericht voor vrijdag: Eerste licht 7-8u nog mooi in N-H heuphoog met zuid 4bft offshore. Rond Egmond en Zvoort al snel te side en toenemende naar 5bft wind. Wijk langer goed te doen tot 10u mid-tij. Ook Z-H langer goed, vooral rond schev en hvh. In Z-H komt afgaand te laat, wel nog goed op schev van 17-20u.`;

test.describe('Expert Paste (US2)', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/expert');
	});

	test('paste form textarea is visible', async ({ page }) => {
		await expect(page.locator('textarea')).toBeVisible();
	});

	test('submit button is disabled when textarea is empty', async ({ page }) => {
		const btn = page.locator('button[type="submit"]');
		await expect(btn).toBeDisabled();
	});

	test('pasting text enables submit button', async ({ page }) => {
		await page.locator('textarea').fill(APPENDIX_C);
		const btn = page.locator('button[type="submit"]');
		await expect(btn).toBeEnabled();
	});

	test('submitting forecast text adds entry to history list', async ({ page }) => {
		await page.locator('textarea').fill(APPENDIX_C);
		await page.locator('button[type="submit"]').click();

		// After submit, at least one message card should appear
		const cards = page.locator('.message-card');
		await expect(cards).toHaveCount(1, { timeout: 5000 });
	});

	test('message entry shows excerpt of pasted text', async ({ page }) => {
		await page.locator('textarea').fill(APPENDIX_C);
		await page.locator('button[type="submit"]').click();

		await expect(page.locator('.excerpt')).toContainText('Korte Samenvatting');
	});

	test('expanding a message card shows extracties section', async ({ page }) => {
		await page.locator('textarea').fill(APPENDIX_C);
		await page.locator('button[type="submit"]').click();

		await page.locator('.expand-btn').first().click();
		await expect(page.locator('text=Extracties')).toBeVisible();
	});

	test('expanding shows at least one extraction chip', async ({ page }) => {
		await page.locator('textarea').fill(APPENDIX_C);
		await page.locator('button[type="submit"]').click();

		await page.locator('.expand-btn').first().click();
		const chips = page.locator('.chip');
		await expect(chips).toHaveCount({ minimum: 1 } as Parameters<typeof expect>[0]);
	});

	test('remove button deletes message from history', async ({ page }) => {
		await page.locator('textarea').fill(APPENDIX_C);
		await page.locator('button[type="submit"]').click();

		await expect(page.locator('.message-card')).toHaveCount(1);
		await page.locator('.remove-btn').first().click();
		await expect(page.locator('.message-card')).toHaveCount(0);
	});
});
