export default async function handler(req, res) {
    // 1. Block anything other than POST requests
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { shloka } = req.body;
    const apiKey = process.env.Gemini_API_Key; 

    // 2. Strict API Key Validation
    if (!apiKey) {
        return res.status(500).json({ error: 'API key is missing in Vercel settings.' });
    }

    // 3. Prompt Construction
    const prompt = `You are an expert Ayurvedic scholar. Translate and explain the following Sanskrit shloka:\n\n"${shloka}"\n\nProvide the response strictly in a raw JSON format exactly like this: {"translation": "your english translation here", "explanation": "your brief explanation here"}. Do NOT use markdown like \`\`\`json.`;

    // 4. THE BYPASS: Using 'gemini-1.5-pro' to completely avoid the 'flash' architecture issues
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${apiKey}`;

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }]
            })
        });

        const apiData = await response.json();
        
        // 5. Direct Error Handling
        if (!response.ok || apiData.error) {
            return res.status(500).json({ error: `API Error: ${apiData.error?.message || 'Google servers rejected the request'}` });
        }

        // 6. Safe Parsing of AI Text
        let aiText = apiData.candidates[0].content.parts[0].text;
        
        // Clean markdown formatting if AI still adds it
        aiText = aiText.replace(/```json/gi, '').replace(/```/g, '').trim();

        const jsonStart = aiText.indexOf('{');
        const jsonEnd = aiText.lastIndexOf('}') + 1;
        
        if (jsonStart !== -1 && jsonEnd !== -1) {
            const cleanJson = aiText.slice(jsonStart, jsonEnd);
            return res.status(200).json(JSON.parse(cleanJson));
        } else {
            return res.status(500).json({ error: "AI response was not in proper JSON format." });
        }

    } catch (error) {
        return res.status(500).json({ error: `Server Crash: ${error.message}` });
    }
}
