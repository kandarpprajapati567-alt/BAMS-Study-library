export default async function handler(req, res) {
    // --- 1. CORS Headers (To prevent browser blocking issues) ---
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    // Handle preflight request
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { shloka } = req.body;
    
    // --- 2. Empty Payload Check ---
    if (!shloka || shloka.trim() === '') {
        return res.status(400).json({ error: 'System Error: Shloka text receive nahi hua.' });
    }

    const apiKey = process.env.Gemini_API_Key; 

    if (!apiKey) {
        return res.status(500).json({ error: 'API key Vercel environment mein nahi mili.' });
    }

    const prompt = `You are an expert Ayurvedic scholar. Translate and explain the following Sanskrit shloka:\n\n"${shloka}"\n\nProvide the response strictly in a raw JSON format exactly like this: {"translation": "your english translation here", "explanation": "your brief explanation here"}. Do NOT use markdown like \`\`\`json.`;

    try {
        // STEP 1: Google se poochenge ki is API key par kaunse models allowed hain
        const modelsRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
        const modelsData = await modelsRes.json();

        if (modelsData.error) {
             return res.status(500).json({ error: `API Key Issue: ${modelsData.error.message}` });
        }

        // STEP 2: Jo model allowed hai, usko automatically select karenge
        const availableModels = modelsData.models.map(m => m.name);
        
        let selectedModel = "";
        if (availableModels.includes("models/gemini-1.5-flash")) {
            selectedModel = "gemini-1.5-flash";
        } else if (availableModels.includes("models/gemini-1.5-pro")) {
            selectedModel = "gemini-1.5-pro";
        } else if (availableModels.includes("models/gemini-1.0-pro")) {
            selectedModel = "gemini-1.0-pro";
        } else if (availableModels.includes("models/gemini-pro")) {
            selectedModel = "gemini-pro";
        } else {
            // Agar koi standard model match nahi hua, to list me se pehla Gemini model utha lo
            const fallback = modelsData.models.find(m => m.name.includes("gemini") && m.supportedGenerationMethods?.includes("generateContent"));
            if (fallback) {
                selectedModel = fallback.name.replace("models/", "");
            } else {
                return res.status(500).json({ error: `Aapki API key me koi bhi compatible Gemini model nahi mila. Allowed: ${availableModels.join(", ")}` });
            }
        }

        // --- 3. Safety Settings (Prevent Medical/Ayurveda blocks) ---
        const safetySettings = [
            { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_ONLY_HIGH" },
            { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_ONLY_HIGH" },
            { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_ONLY_HIGH" },
            { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_ONLY_HIGH" }
        ];

        // STEP 3: Ab selected model ko final request bhejenge
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                safetySettings: safetySettings
            })
        });

        const apiData = await response.json();
        
        if (!response.ok || apiData.error) {
            return res.status(500).json({ error: `Model (${selectedModel}) Error: ${apiData.error?.message}` });
        }

        // --- 4. Empty Response / Block Check ---
        if (!apiData.candidates || apiData.candidates.length === 0) {
            if (apiData.promptFeedback && apiData.promptFeedback.blockReason) {
                return res.status(500).json({ error: `AI ne response block kar diya hai. Reason: ${apiData.promptFeedback.blockReason}` });
            }
            return res.status(500).json({ error: `AI se koi data nahi aaya. Raw Response: ${JSON.stringify(apiData)}` });
        }

        let aiText = apiData.candidates[0].content.parts[0].text;
        
        // Response ko saaf karna taaki koi extra spaces ya markdown na rahe
        aiText = aiText.replace(/```json/gi, '').replace(/```/g, '').trim();

        try {
            const jsonStart = aiText.indexOf('{');
            const jsonEnd = aiText.lastIndexOf('}') + 1;
            
            if (jsonStart !== -1 && jsonEnd !== -1) {
                const cleanJson = aiText.slice(jsonStart, jsonEnd);
                const parsedData = JSON.parse(cleanJson);
                return res.status(200).json(parsedData);
            } else {
                throw new Error("No JSON format found.");
            }
        } catch (parseError) {
            return res.status(500).json({ error: `Parsing failed. AI ka exact jawab tha: ${aiText}` });
        }

    } catch (error) {
        return res.status(500).json({ error: `Server Crash: ${error.message}` });
    }
}
