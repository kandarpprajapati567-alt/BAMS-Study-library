export default async function handler(req, res) {
    // 1. Block anything other than POST requests
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { shloka } = req.body;
    
    // 2. Updated API Key variable name as requested
    const apiKey = process.env.Gemini_api_key; 

    if (!apiKey) {
        return res.status(500).json({ error: 'API key is missing in Vercel settings.' });
    }

    // 3. Independent Prompts for Specific Tasks
    const promptTranslation = `You are an expert Ayurvedic scholar. Translate the following Sanskrit shloka to English. Provide the response strictly in a raw JSON format exactly like this: {"translation": "your english translation here"}. Shloka: "${shloka}"`;
    
    const promptExplanation = `You are an expert Ayurvedic scholar. Provide a brief, deep explanation and understanding of this Sanskrit shloka. Provide the response strictly in a raw JSON format exactly like this: {"explanation": "your brief explanation here"}. Shloka: "${shloka}"`;

    // 4. Using the latest models as per your requirement
    const urlFlash = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${apiKey}`;
    const urlPro = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-pro:generateContent?key=${apiKey}`;

    // Helper function for API calls to keep code clean and bug-free
    const fetchGemini = async (url, promptText) => {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: promptText }] }],
                // BUG PREVENTION: Forces the model to return 100% pure JSON (No markdown issues)
                generationConfig: { response_mime_type: "application/json" }
            })
        });
        
        const data = await response.json();
        if (!response.ok || data.error) {
            throw new Error(`API Error: ${data.error?.message || 'Google servers rejected the request'}`);
        }
        
        return JSON.parse(data.candidates[0].content.parts[0].text);
    };

    try {
        // 5. FAST ⏩ EXECUTION: Calling both models simultaneously
        const [flashData, proData] = await Promise.all([
            fetchGemini(urlFlash, promptTranslation), // Fast translation
            fetchGemini(urlPro, promptExplanation)    // Deep understanding
        ]);

        // Combine the results and send them back to index.html
        return res.status(200).json({
            translation: flashData.translation || "Translation generated with fallback.",
            explanation: proData.explanation || "Explanation generated with fallback."
        });

    } catch (error) {
        return res.status(500).json({ error: `Server Crash: ${error.message}` });
    }
}
