import { test, expect } from '@playwright/test';

test.describe('Day Detail (US1)', () => {
	// Seed forecast and navigate to first day
	test.beforeEach(async ({ page }) => {
		await page.goto('/');
		const targetDate = await page.evaluate(() => {
			const d = new Date();
			d.setDate(d.getDate() + 1);
			return d.toISOString().slice(0, 10);
		});

		await page.evaluate((date) => {
			const slots = Array.from({ length: 24 }, (_, h) => {
				const d = new Date(`${date}T${String(h).padStart(2,'0')}:00:00Z`);
				return {
					timestamp: d.toISOString(),
					swellHeight: 1.1,
					swellPeriod: 12,
					swellDirection: 300,
					windWaveHeight: 0.4,
					windWavePeriod: 6,
					windSpeed: 4,
					windDirection: 95,
					windGusts: 6,
					tideHeight: -10,
					tideState: 'mid',
					tideDirection: 'ebbing',
					score: {
						composite: 4.1,
						cappedByHeight: false,
						parameters: {
							swellDirection: { value: 4, label: 'good', explanation: 'NW swell' },
							windDirection:  { value: 5, label: 'excellent', explanation: 'E offshore' },
							swellHeight:    { value: 4, label: 'good', explanation: '1.1m' },
							swellPeriod:    { value: 4, label: 'good', explanation: '12s' },
							tideState:      { value: 4, label: 'good', explanation: 'Mid tide' }
						}
					},
					confidence: 'standard',
					dataFetchedAt: new Date().toISOString()
				};
			});
			// Also add a reduced-confidence slot 9 days out
			const far = new Date(date);
			far.setDate(far.getDate() + 9);
			const farDate = far.toISOString().slice(0, 10);
			const farSlot = {
				timestamp: `${farDate}T12:00:00Z`,
				swellHeight: 0.8, swellPeriod: 9, swellDirection: 285,
				windWaveHeight: 0.3, windWavePeriod: 5,
				windSpeed: 6, windDirection: 100, windGusts: 8,
				tideHeight: 50, tideState: 'high', tideDirection: 'slack',
				score: {
					composite: 2.5,
					cappedByHeight: false,
					parameters: {
						swellDirection: { value: 3, label: 'fair', explanation: '' },
						windDirection:  { value: 3, label: 'fair', explanation: '' },
						swellHeight:    { value: 2, label: 'poor', explanation: '' },
						swellPeriod:    { value: 3, label: 'fair', explanation: '' },
						tideState:      { value: 2, label: 'poor', explanation: '' }
					}
				},
				confidence: 'reduced',
				dataFetchedAt: new Date().toISOString()
			};

			const cache = {
				location: 'scheveningen',
				fetchedAt: new Date().toISOString(),
				slots: [...slots, farSlot],
				nextBestSession: null,
				dataSourceStatus: { wave: 'ok', wind: 'ok', tide: 'ok' }
			};
			return import('idb-keyval').then(({ set }) =>
				set('forecast_scheveningen', cache)
			);
		}, targetDate);

		await page.goto(`/day/${targetDate}`);
	});

	test('hourly table rows render', async ({ page }) => {
		const rows = page.locator('.hourly-table tbody tr.slot-row');
		await expect(rows).toHaveCount(24);
	});

	test('swell height column is present', async ({ page }) => {
		const firstRow = page.locator('.hourly-table tbody tr.slot-row').first();
		// swell height is in second column (td:nth-child(2))
		const swellCell = firstRow.locator('td').nth(1);
		await expect(swellCell).toContainText('m');
	});

	test('wind direction column shows Bft', async ({ page }) => {
		const firstRow = page.locator('.hourly-table tbody tr.slot-row').first();
		const windCell = firstRow.locator('td').nth(4);
		await expect(windCell).toContainText('Bft');
	});

	test('tide state column is present', async ({ page }) => {
		const firstRow = page.locator('.hourly-table tbody tr.slot-row').first();
		const tideCell = firstRow.locator('td').nth(5);
		await expect(tideCell).not.toBeEmpty();
	});

	test('clicking a row expands ScoreBreakdown', async ({ page }) => {
		const firstRow = page.locator('.hourly-table tbody tr.slot-row').first();
		await firstRow.click();
		const breakdown = page.locator('.breakdown').first();
		await expect(breakdown).toBeVisible();
	});

	test('back button navigates to dashboard', async ({ page }) => {
		await page.locator('button', { hasText: /Terug/i }).click();
		await expect(page).toHaveURL('/');
	});

	test('reduced-confidence day shows ~ prefix in DayRow', async ({ page }) => {
		await page.goto('/');
		// A row with reduced confidence should show ~ prefix
		const reducedRow = page.locator('.day-score', { hasText: /~/ });
		await expect(reducedRow).toHaveCount({ minimum: 1 } as Parameters<typeof expect>[0]);
	});
});
