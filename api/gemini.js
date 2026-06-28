export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const { shloka } = req.body;
    const apiKey = process.env.Gemini_api_key; 

    // Final URL structure (Yeh URL Google ke server par exist karta hai)
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    const prompt = `Translate and explain: "${shloka}". Respond ONLY in this JSON format: {"translation": "...", "explanation": "..."}`;

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: { response_mime_type: "application/json" }
            })
        });

        const data = await response.json();
        
        if (!response.ok) {
            // Agar yahan error aaye, toh error message wahi hai jo aapne screenshot me dikhaya
            return res.status(500).json({ error: data.error?.message || "Model access issue" });
        }

        const result = JSON.parse(data.candidates[0].content.parts[0].text);
        return res.status(200).json(result);

    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}
