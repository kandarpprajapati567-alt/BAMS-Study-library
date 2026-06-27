// api/gemini.js
export default async function handler(req, res) {
    // Sirf POST requests allow karenge security ke liye
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // Frontend se shloka ka text nikalna
    const { shloka } = req.body;
    
    // Vercel se aapki API Key uthana
    const apiKey = process.env.Gemini_API_Key; 

    if (!apiKey) {
        return res.status(500).json({ error: 'API key Vercel environment mein nahi mili' });
    }

    // Gemini AI ko clear instruction dena ki JSON format me hi answer de
    const prompt = `You are an expert Ayurvedic scholar. Translate and explain the following Sanskrit shloka:\n\n"${shloka}"\n\nProvide the response strictly in a raw JSON format exactly like this (do not use markdown formatting like \`\`\`json): {"translation": "your accurate english translation here", "explanation": "your brief contextual explanation here"}`;

    try {
        // Gemini API ko call lagana
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }]
            })
        });

        const apiData = await response.json();
        
        // Agar Gemini API se koi error aaye
        if (apiData.error) {
            return res.status(500).json({ error: apiData.error.message });
        }

        // Gemini ka answer nikalna
        const aiText = apiData.candidates[0].content.parts[0].text;

        // Code ko crash hone se bachane ke liye text me se sirf JSON extract karna
        const jsonMatch = aiText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            const parsedData = JSON.parse(jsonMatch[0]);
            // Frontend ko successfully answer bhej dena
            return res.status(200).json(parsedData);
        } else {
            return res.status(500).json({ error: 'Failed to parse AI response' });
        }

    } catch (error) {
        console.error("Backend Error:", error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
}
