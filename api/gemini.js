export default async function handler(req, res) {
    // 1. Block anything other than POST requests
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { shloka } = req.body;
    
    // Ensure this matches your Vercel Environment Variables exactly!
    const apiKey = process.env.Gemini_API_Key; 

    // 2. Strict API Key Validation
    if (!apiKey) {
        return res.status(500).json({ error: 'API key is missing in Vercel settings.' });
    }

    // 3. Prompt Construction
    const prompt = `You are an expert Ayurvedic scholar. Translate and explain the following Sanskrit shloka:\n\n"${shloka}"\n\nProvide the response strictly in a raw JSON format exactly like this: {"translation": "your english translation here", "explanation": "your brief explanation here"}.`;

    // 4. Corrected API URL: Using v1beta and gemini-1.5-flash
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                // This forces Gemini to output pure JSON, preventing formatting errors
                generationConfig: {
                    responseMimeType: "application/json"
                }
            })
        });

        const apiData = await response.json();
        
        // 5. Direct Error Handling
        if (!response.ok || apiData.error) {
            return res.status(500).json({ error: `API Error: ${apiData.error?.message || 'Google servers rejected the request'}` });
        }

        // 6. Safe Parsing of AI Text
        const aiText = apiData.candidates[0].content.parts[0].text;
        
        // Because we forced responseMimeType, we can parse it directly
        return res.status(200).json(JSON.parse(aiText));

    } catch (error) {
        return res.status(500).json({ error: `Server Crash: ${error.message}` });
    }
}
