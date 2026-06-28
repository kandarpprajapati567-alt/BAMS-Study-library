export default async function handler(req, res) {
    // Only allow POST requests for security
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { shloka } = req.body;
    if (!shloka) {
        return res.status(400).json({ error: 'Shloka text is required' });
    }

    try {
        // Access your secure environment variable
        const apiKey = process.env.GEMINI_API_KEY;
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

        // Instruct the AI to respond STRICTLY in JSON format
        const prompt = `
            Analyze the following Sanskrit shloka:
            "${shloka}"
            
            Provide a translation and a brief contextual explanation.
            Respond ONLY with a valid JSON object in the exact following format, without any markdown formatting or extra text:
            {"translation": "...", "explanation": "..."}
        `;

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }]
            })
        });

        const data = await response.json();
        
        if (!response.ok) {
           throw new Error(data.error?.message || 'Failed to fetch from Gemini');
        }

        // Extract AI response text
        let aiText = data.candidates[0].content.parts[0].text;
        
        // Safety step: Clean up Markdown code block wrappers (like ```json) if the AI includes them
        aiText = aiText.replace(/```json/g, '').replace(/```/g, '').trim();
        
        // Parse the string into a real JSON object
        const parsedData = JSON.parse(aiText);

        // Send the clean data back to your frontend
        return res.status(200).json(parsedData);
        
    } catch (error) {
        console.error('Gemini API Error:', error);
        return res.status(500).json({ error: 'Failed to process shloka translation.', details: error.message });
    }
}
