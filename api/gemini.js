export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { shloka } = req.body;
    const apiKey = process.env.Gemini_API_Key; 

    if (!apiKey) {
        return res.status(500).json({ error: 'API key Vercel environment mein nahi mili. Vercel Settings check karein.' });
    }

    const prompt = `You are an expert Ayurvedic scholar. Translate and explain the following Sanskrit shloka:\n\n"${shloka}"\n\nProvide the response strictly in a raw JSON format exactly like this: {"translation": "your english translation here", "explanation": "your brief explanation here"}. Do NOT use markdown like \`\`\`json.`;

    try {
        // FIXED: Changed model to 'gemini-pro' which is universally supported
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }]
            })
        });

        const apiData = await response.json();
        
        if (!response.ok || apiData.error) {
            return res.status(500).json({ error: `Gemini API Error: ${apiData.error?.message || 'Unknown Error'}` });
        }

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
            return res.status(500).json({ error: `Failed to parse AI response. Raw Text from AI: ${aiText}` });
        }

    } catch (error) {
        return res.status(500).json({ error: `Internal Server Error: ${error.message}` });
    }
}
