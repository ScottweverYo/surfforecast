import adapter from '@sveltejs/adapter-static';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		adapter: adapter({
			fallback: 'index.html' // SPA mode: all routes served from index.html
		}),
		alias: {
			'$components': 'src/components'
		}
	}
};

export default config;
