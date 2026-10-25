import { BACKEND_URL, ALLOW_PRODUCTION_WRITES } from "$app/env/private";
import type { RequestHandler } from './$types';

// 明確指定正式與預覽後端；未設定時回傳錯誤，不隱性連到正式環境。
const handler: RequestHandler = async ({ request, url }) => {
    if (!BACKEND_URL) return new Response('後端尚未設定', { status: 503 });
    const backendUrl = BACKEND_URL;
    const productionBackend = new URL(backendUrl).hostname.endsWith('.run.app');
    if (productionBackend && ALLOW_PRODUCTION_WRITES !== 'true' && !['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
        return new Response(JSON.stringify({ detail: '預覽站不開放正式資料操作，請使用正式網站。' }), {
            status: 403, headers: { 'content-type': 'application/json', 'cache-control': 'private, no-store' },
        });
    }
	const targetUrl = `${backendUrl}${url.pathname}${url.search}`;

	const headers = new Headers();
	for (const [key, value] of request.headers.entries()) {
		if (
			key === 'host' ||
			key === 'connection' ||
			key === 'content-length' ||
			key.startsWith('x-vercel') ||
			key.startsWith('x-forwarded')
		) {
			continue;
		}
		headers.set(key, value);
	}

	// 有 body 的請求先 buffer，避免串流失去 content-length 導致 FastAPI multipart 解析失敗
	let body: ArrayBuffer | undefined;
	if (request.method !== 'GET' && request.method !== 'HEAD') {
		body = await request.arrayBuffer();
		headers.set('content-length', body.byteLength.toString());
	}

	const response = await fetch(targetUrl, {
		method: request.method,
		headers,
		body,
		redirect: 'follow'
	});

	const responseHeaders = new Headers();
	for (const [key, value] of response.headers.entries()) {
		if (key === 'transfer-encoding' || key === 'content-encoding' || key === 'content-length') continue;
		responseHeaders.set(key, value);
	}

	return new Response(response.body, {
		status: response.status,
		statusText: response.statusText,
		headers: responseHeaders
	});
};

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const PATCH = handler;
export const DELETE = handler;
export const HEAD = handler;
export const OPTIONS = handler;

// 不對 /api/v1 做尾斜線正規化（否則會 308 改寫路徑）
export const trailingSlash = 'ignore';
