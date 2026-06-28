export default async function handler(req, res) {
    // 1. Block anything other than POST requests
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { shloka } = req.body;
    
    // 2. API Key fetch
    const apiKey = process.env.Gemini_api_key; 

    // STRICT CHECK: Agar Vercel se key nahi aayi, toh yahi error dega
    if (!apiKey || apiKey === 'undefined' || apiKey.trim() === '') {
        return res.status(500).json({ error: 'API Key is missing! Vercel me Environment Variable check karein aur project REDEPLOY karein.' });
    }

    // 3. Prompts
    const promptTranslation = `You are an expert Ayurvedic scholar. Translate the following Sanskrit shloka to English. Provide the response strictly in a raw JSON format exactly like this: {"translation": "your english translation here"}. Shloka: "${shloka}"`;
    
    const promptExplanation = `You are an expert Ayurvedic scholar. Provide a brief, deep explanation and understanding of this Sanskrit shloka. Provide the response strictly in a raw JSON format exactly like this: {"explanation": "your brief explanation here"}. Shloka: "${shloka}"`;

    // 4. Model URLs (Without API key in URL, we will send it safely in headers)
    const urlFlash = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent`;
    const urlPro = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-pro:generateContent`;

    // Helper function
    const fetchGemini = async (url, promptText) => {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                // SAFEST WAY TO PASS API KEY:
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
        // 5. Calling both models at the same time (Fast execution)
        const [flashData, proData] = await Promise.all([
            fetchGemini(urlFlash, promptTranslation),
            fetchGemini(urlPro, promptExplanation)
        ]);

        return res.status(200).json({
            translation: flashData.translation || "Translation error.",
            explanation: proData.explanation || "Explanation error."
        });

    } catch (error) {
        return res.status(500).json({ error: `API Error: ${error.message}` });
    }
}
