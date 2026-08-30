// Bật chế độ Edge Runtime để hỗ trợ Streaming mượt mà và bỏ qua giới hạn 10s
export const config = {
    runtime: 'edge'
};

export default async function handler(req) {
    // Chỉ cho phép phương thức POST
    if (req.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
            status: 405,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    // Lấy API Key từ biến môi trường của Vercel
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
        return new Response(JSON.stringify({ error: 'Server chưa được cấu hình API Key' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:streamGenerateContent?alt=sse&key=${apiKey}`;

    try {
        // Đọc dữ liệu body do frontend gửi lên
        const body = await req.json();

        // Gửi yêu cầu từ Server của bạn lên Google Gemini
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        // Nếu Google Gemini báo lỗi (ví dụ: sai key, hết hạn mức)
        if (!response.ok) {
            const errorData = await response.text();
            return new Response(errorData, { status: response.status });
        }

        // TRẢ THẲNG LUỒNG STREAM VỀ FRONTEND 
        // (Đây là chìa khóa giúp UI có hiệu ứng gõ chữ và không bị timeout)
        return new Response(response.body, {
            status: 200,
            headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive'
            }
        });

    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}