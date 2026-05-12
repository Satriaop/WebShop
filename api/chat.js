// api/chat.js
// Vercel Serverless Function — API key disimpan aman di environment variable
// Set di Vercel Dashboard: Settings → Environment Variables → API_KEY
// Format nilai API_KEY: "key1,key2,key3" (pisah koma jika multi-key)

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'method not allowed' });
    }

    // Ambil API keys dari environment variable
    // Format: satu key atau banyak key dipisah koma
    const rawKeys = process.env.API_KEY || '';
    const keys = rawKeys.split(',').map(k => k.trim()).filter(Boolean);

    if (keys.length === 0) {
        return res.status(500).json({ error: 'API_KEY environment variable belum diset di Vercel' });
    }

    const { messages, keyIndex = 0 } = req.body;

    if (!messages || !Array.isArray(messages)) {
        return res.status(400).json({ error: 'messages tidak valid' });
    }

    // Rotasi key: coba dari keyIndex, kalau 429/error coba key berikutnya
    let lastError = null;
    for (let attempt = 0; attempt < keys.length; attempt++) {
        const idx = (keyIndex + attempt) % keys.length;
        const apiKey = keys[idx];

        try {
            const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${apiKey}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    model: "llama3-8b-8192",
                    messages,
                    max_tokens: 1024,
                })
            });

            const data = await groqRes.json();

            if (data.error) {
                // Rate limit / auth error → coba key berikutnya
                lastError = data.error.message;
                continue;
            }

            // Kembalikan jawaban + index key yang berhasil (untuk rotasi di sisi client)
            return res.status(200).json({
                reply: data.choices[0].message.content,
                usedKeyIndex: idx
            });

        } catch (e) {
            lastError = e.message;
            continue;
        }
    }

    // Semua key gagal
    return res.status(503).json({
        error: lastError || 'semua api key sedang bermasalah, coba lagi nanti'
    });
}
