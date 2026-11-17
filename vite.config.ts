import adapter from '@sveltejs/adapter-cloudflare';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [tailwindcss(), sveltekit({
		adapter: adapter(),
		preprocess: vitePreprocess(),
		// 腳本只允許本站（SvelteKit 內嵌腳本自動加 nonce/hash）與 Google／Apple 登入。
		// 樣式保留 unsafe-inline：元件大量使用 style 屬性，攻擊面主要在腳本。
		csp: {
			mode: 'auto',
			directives: {
				'default-src': ['self'],
				'script-src': ['self', 'https://accounts.google.com/gsi/client', 'https://appleid.cdn-apple.com'],
				'style-src': ['self', 'unsafe-inline', 'https://fonts.googleapis.com', 'https://accounts.google.com/gsi/style'],
				'font-src': ['self', 'https://fonts.gstatic.com', 'data:'],
				'img-src': ['self', 'data:', 'blob:', 'https:'],
				'connect-src': ['self', 'https://accounts.google.com/gsi/', 'https://appleid.apple.com'],
				'frame-src': ['https://accounts.google.com/gsi/', 'https://appleid.apple.com'],
				'object-src': ['none'],
				'base-uri': ['self'],
				'form-action': ['self', 'https://appleid.apple.com'],
				'frame-ancestors': ['none']
			}
		}
	})],
	// 建置預覽走 SvelteKit 的實際 API 代理，不沿用開發環境的本機後端。
	preview: { proxy: {} },
	server: {
		// 本機開發：/api/v1 代理到本機後端（8001）
		proxy: {
			'/api/v1': { target: 'http://localhost:8001', changeOrigin: true }
		}
	}
});
