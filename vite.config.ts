import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
	plugins: [
		sveltekit(),
		VitePWA({
			registerType: 'autoUpdate',
			manifest: {
				name: 'Surfforecast Scheveningen',
				short_name: 'Surfforecast',
				description: 'Surf condition predictor for Scheveningen, Netherlands',
				theme_color: '#0ea5e9',
				background_color: '#0f172a',
				display: 'standalone',
				start_url: '/',
				icons: [
					{ src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
					{ src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' }
				]
			},
			workbox: {
				globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,woff2}'],
				// /share-target is a client-side SPA route. All navigations (including OS
				// share-sheet activations) fall back to index.html which bootstraps SvelteKit.
				navigateFallback: 'index.html',
				runtimeCaching: [
					{
						urlPattern: /^https:\/\/marine-api\.open-meteo\.com\//,
						handler: 'NetworkFirst',
						options: { cacheName: 'open-meteo-marine', expiration: { maxAgeSeconds: 60 * 60 * 6 } }
					},
					{
						urlPattern: /^https:\/\/api\.open-meteo\.com\//,
						handler: 'NetworkFirst',
						options: { cacheName: 'open-meteo-wind', expiration: { maxAgeSeconds: 60 * 60 * 6 } }
					},
					{
						urlPattern: /^https:\/\/waterwebservices\.rijkswaterstaat\.nl\//,
						handler: 'NetworkFirst',
						options: { cacheName: 'rws-tide', expiration: { maxAgeSeconds: 60 * 60 * 6 } }
					}
				]
			}
		})
	],
	test: {
		environment: 'jsdom',
		include: ['tests/unit/**/*.test.ts'],
		globals: true
	}
});
