export default async function handler(req, res) {
    // 1. Check Request Method
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { shloka } = req.body;
    const apiKey = process.env.Gemini_API_Key; 

    // 2. Validate API Key
    if (!apiKey) {
        return res.status(500).json({ error: 'API key not found in Vercel.' });
    }

    const prompt = `You are an expert Ayurvedic scholar. Translate and explain the following Sanskrit shloka:\n\n"${shloka}"\n\nProvide the response strictly in a raw JSON format exactly like this: {"translation": "your english translation here", "explanation": "your brief explanation here"}. Do NOT use markdown like \`\`\`json.`;

    // 3. THE FIX: Using the stable 'v1' API version with 'gemini-1.5-flash'
    const url = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }]
            })
        });

        const apiData = await response.json();
        
        // 4. Handle API Errors
        if (!response.ok || apiData.error) {
            return res.status(500).json({ error: `Gemini API Error: ${apiData.error?.message || 'Unknown Error'}` });
        }

        // 5. Clean AI Text
        let aiText = apiData.candidates[0].content.parts[0].text;
        aiText = aiText.replace(/```json/gi, '').replace(/```/g, '').trim();

        // 6. Parse JSON Safely
        const jsonStart = aiText.indexOf('{');
        const jsonEnd = aiText.lastIndexOf('}') + 1;
        
        if (jsonStart !== -1 && jsonEnd !== -1) {
            const cleanJson = aiText.slice(jsonStart, jsonEnd);
            const parsedData = JSON.parse(cleanJson);
            return res.status(200).json(parsedData);
        } else {
            return res.status(500).json({ error: "Invalid AI response format." });
        }

    } catch (error) {
        return res.status(500).json({ error: `Server Error: ${error.message}` });
    }
}
