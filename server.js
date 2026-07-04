require('dotenv').config();
const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8080;

app.use(express.json());
app.use(express.static(__dirname)); // Serve index.html and assets

app.post('/api/generate', async (req, res) => {
  try {
    const { systemPrompt, userMsg } = req.body;

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "HTTP-Referer": "http://localhost:8080", // Required by OpenRouter for some keys
        "X-Title": "AI Resume Builder"
      },
      body: JSON.stringify({
        model: "deepseek/deepseek-chat", // DeepSeek v4 flash / DeepSeek Chat
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMsg }
        ]
      })
    });

    const data = await response.json();
    if (!response.ok || data.error) {
      throw new Error((data.error && data.error.message) || "OpenRouter API Error");
    }

    res.json(data);
  } catch (err) {
    console.error("Error generating resume:", err);
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
