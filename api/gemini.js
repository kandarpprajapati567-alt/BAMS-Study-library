export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { shloka } = req.body;
    const apiKey = process.env.Gemini_API_Key; 

    if (!apiKey) {
        console.error("SYSTEM ERROR: API Key missing in Vercel Environment Variables."); 
        return res.status(500).json({ error: 'API key not found in Vercel settings.' });
    }

    const prompt = `You are an expert Ayurvedic scholar. Translate and explain the following Sanskrit shloka:\n\n"${shloka}"\n\nProvide the response strictly in a raw JSON format exactly like this: {"translation": "your english translation here", "explanation": "your brief explanation here"}. Do NOT use markdown like \`\`\`json.`;

    // Restored the correct, active model: gemini-1.5-flash
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    
    const maxRetries = 3;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }]
                })
            });

            const apiData = await response.json();
            
            // Handle High Demand (503) or other errors
            if (!response.ok || apiData.error) {
                const isHighDemand = response.status === 503 || (apiData.error?.message && apiData.error.message.includes("high demand"));
                
                if (isHighDemand && attempt < maxRetries) {
                    console.warn(`Attempt ${attempt} failed due to high demand. Retrying in 1.5 seconds...`);
                    // Wait for 1.5 seconds before trying again
                    await new Promise(resolve => setTimeout(resolve, 1500));
                    continue; 
                }
                
                console.error("GOOGLE API ERROR:", JSON.stringify(apiData.error)); 
                return res.status(500).json({ error: `Gemini API Error: ${apiData.error?.message || 'Unknown Error'}` });
            }

            // Clean and parse the AI response
            let aiText = apiData.candidates[0].content.parts[0].text;
            aiText = aiText.replace(/```json/gi, '').replace(/```/g, '').trim();

            const jsonStart = aiText.indexOf('{');
            const jsonEnd = aiText.lastIndexOf('}') + 1;
            
            if (jsonStart !== -1 && jsonEnd !== -1) {
                const cleanJson = aiText.slice(jsonStart, jsonEnd);
                const parsedData = JSON.parse(cleanJson);
                return res.status(200).json(parsedData);
            } else {
                throw new Error("No JSON format found in AI response.");
            }

        } catch (error) {
            if (attempt === maxRetries) {
                console.error("VERCEL SERVER ERROR:", error.message); 
                return res.status(500).json({ error: `Internal Server Error: ${error.message}` });
            }
            // Wait before retrying on network failures
            await new Promise(resolve => setTimeout(resolve, 1500));
        }
    }
    
    // Fallback if all retries fail
    return res.status(503).json({ error: 'Google AI servers are currently overloaded. Please try again in a few minutes.' });
}
