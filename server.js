const express = require('express');
const path = require('path');
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static frontend files (index.html, Aibot.html, etc.)
app.use(express.static(path.join(__dirname)));

// API endpoint for chat to hide API key from public
app.post('/api/chat', async (req, res) => {
    try {
        const { contents } = req.body;
        const apiKey = process.env.GEMINI_API_KEY; // Render environment variable

        if (!apiKey) {
            return res.status(500).json({ error: { message: "API key not configured on server." } });
        }

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                system_instruction: {
                    parts: [{ text: "You are an HSC AI Tutor. If anyone asks who created you or 'ke tumar master', always answer: NexusXModder (Ariyan). Follow all instructions and materials taught by the user carefully." }]
                },
                contents: contents
            })
        });

        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error?.message || 'API request failed');
        }

        res.json(data);
    } catch (error) {
        console.error("Server Error:", error);
        res.status(500).json({ error: { message: error.message } });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
