export default async function handler(req, res) {
    // 1. Block anything other than POST requests
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { shloka } = req.body;
    
    // 2. Fetch API Key
    const apiKey = process.env.Gemini_api_key; 

    if (!apiKey || apiKey === 'undefined' || apiKey.trim() === '') {
        return res.status(500).json({ error: 'API Key is missing in Vercel settings.' });
    }

    // 3. Prompts for Dual Processing
    const promptTranslation = `You are an expert Ayurvedic scholar. Translate the following Sanskrit shloka to English. Provide the response strictly in a raw JSON format exactly like this: {"translation": "your english translation here"}. Shloka: "${shloka}"`;
    
    const promptExplanation = `You are an expert Ayurvedic scholar. Provide a brief, deep explanation and understanding of this Sanskrit shloka. Provide the response strictly in a raw JSON format exactly like this: {"explanation": "your brief explanation here"}. Shloka: "${shloka}"`;

    // 4. OFFICIAL GOOGLE API MODEL STRINGS (This fixes the "not found" error)
    // Adding "-latest" ensures it always finds the active version in your region.
    const urlFlash = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent`;
    const urlPro = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro-latest:generateContent`;

    // 5. Secure Fetch Function
    const fetchGemini = async (url, promptText) => {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'x-goog-api-key': apiKey 
            },
            body: JSON.stringify({
                contents: [{ parts: [{ text: promptText }] }],
                generationConfig: { response_mime_type: "application/json" }
            })
        });
        
        const data = await response.json();
        
        if (!response.ok || data.error) {
            throw new Error(`${data.error?.message || 'Google servers rejected the request'}`);
        }
        
        return JSON.parse(data.candidates[0].content.parts[0].text);
    };

    try {
        // 6. Fast ⏩ Execution: Calling Flash for Translation & Pro for Explanation
        const [flashData, proData] = await Promise.all([
            fetchGemini(urlFlash, promptTranslation),
            fetchGemini(urlPro, promptExplanation)
        ]);

        return res.status(200).json({
            translation: flashData.translation || "Translation could not be processed.",
            explanation: proData.explanation || "Explanation could not be processed."
        });

    } catch (error) {
        return res.status(500).json({ error: `System Error: ${error.message}` });
    }
}
