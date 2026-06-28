export default async function handler(req, res) {
    // 1. Only allow POST requests
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { shloka } = req.body;
    const apiKey = process.env.Gemini_API_Key; 

    // 2. Check if API key exists
    if (!apiKey) {
        console.error("SYSTEM ERROR: API Key missing in Vercel Environment Variables."); 
        return res.status(500).json({ error: 'API key Vercel environment mein nahi mili. Vercel Settings check karein.' });
    }

    // 3. Construct the prompt
    const prompt = `You are an expert Ayurvedic scholar. Translate and explain the following Sanskrit shloka:\n\n"${shloka}"\n\nProvide the response strictly in a raw JSON format exactly like this: {"translation": "your english translation here", "explanation": "your brief explanation here"}. Do NOT use markdown like \`\`\`json.`;

    try {
        // FIXED: Changed the API version in the URL from 'v1beta' to the stable 'v1'
        const response = await fetch(`https://generativelanguage.googleapis.com/v1/models/gemini-3.5-flash:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }]
            })
        });

        const apiData = await response.json();
        
        // 4. Handle Google API Errors
        if (!response.ok || apiData.error) {
            console.error("GOOGLE API ERROR:", JSON.stringify(apiData.error)); 
            return res.status(500).json({ error: `Gemini API Error: ${apiData.error?.message || 'Unknown Error'}` });
        }

        // 5. Clean and parse the AI response
        let aiText = apiData.candidates[0].content.parts[0].text;
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
            console.error("AI PARSING ERROR. Raw AI Response was:", aiText); 
            return res.status(500).json({ error: `Failed to parse AI response. Raw Text from AI: ${aiText}` });
        }

    } catch (error) {
        console.error("VERCEL SERVER ERROR:", error.message); 
        return res.status(500).json({ error: `Internal Server Error: ${error.message}` });
    }
}
