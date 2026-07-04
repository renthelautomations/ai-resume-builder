module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }

  try {
    const { systemPrompt, userMsg } = req.body;

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "HTTP-Referer": "https://renthelautomations.com", // Adjust as needed
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

    res.status(200).json(data);
  } catch (err) {
    console.error("Error generating resume:", err);
    res.status(500).json({ error: err.message });
  }
};
