// Vercel Edge Function: /api/chat
// Keeps Gemini streamGenerateContent SSE response streaming to the browser.
export const config = {
    runtime: 'edge'
};

const GEMINI_MODEL = 'gemini-2.5-flash';
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:streamGenerateContent?alt=sse`;

function jsonResponse(payload, status = 200) {
    return new Response(JSON.stringify(payload), {
        status,
        headers: {
            'Content-Type': 'application/json; charset=utf-8',
            'Cache-Control': 'no-store'
        }
    });
}

export default async function handler(req) {
    if (req.method !== 'POST') {
        return jsonResponse({ error: { message: 'Method Not Allowed' } }, 405);
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        return jsonResponse({
            error: { message: 'Vercel chưa được cấu hình biến môi trường GEMINI_API_KEY.' }
        }, 500);
    }

    let body;
    try {
        body = await req.json();
    } catch (_) {
        return jsonResponse({ error: { message: 'Request body phải là JSON hợp lệ.' } }, 400);
    }

    if (!body || !Array.isArray(body.contents) || body.contents.length === 0) {
        return jsonResponse({ error: { message: 'Thiếu nội dung hội thoại (contents).' } }, 400);
    }

    try {
        const upstream = await fetch(GEMINI_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                // Dùng header thay vì query string để hạn chế lộ API key trong URL/log.
                'x-goog-api-key': apiKey
            },
            body: JSON.stringify(body),
            signal: req.signal
        });

        if (!upstream.ok) {
            const errorText = await upstream.text();
            return new Response(errorText || JSON.stringify({
                error: { message: `Gemini API trả về HTTP ${upstream.status}.` }
            }), {
                status: upstream.status,
                headers: {
                    'Content-Type': upstream.headers.get('content-type') || 'application/json; charset=utf-8',
                    'Cache-Control': 'no-store'
                }
            });
        }

        if (!upstream.body) {
            return jsonResponse({
                error: { message: 'Gemini API không trả về luồng dữ liệu.' }
            }, 502);
        }

        // Trả trực tiếp ReadableStream; không gom toàn bộ phản hồi vào RAM.
        return new Response(upstream.body, {
            status: upstream.status,
            headers: {
                'Content-Type': upstream.headers.get('content-type') || 'text/event-stream; charset=utf-8',
                'Cache-Control': 'no-cache, no-store, no-transform',
                'X-Content-Type-Options': 'nosniff',
                'X-Accel-Buffering': 'no'
            }
        });

    } catch (error) {
        // Tránh trả lại các chi tiết nội bộ hoặc API key cho trình duyệt.
        const message = error && error.name === 'AbortError'
            ? 'Yêu cầu đã được hủy.'
            : 'Không thể kết nối đến Gemini API. Vui lòng thử lại sau.';
        return jsonResponse({ error: { message } }, error?.name === 'AbortError' ? 499 : 502);
    }
}
