import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }

  try {
    const { systemPrompt, userMsg } = req.body;
    
    // 1. Verify User Authentication
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized: Missing or invalid token' });
    }
    const token = authHeader.split(' ')[1];

    // Initialize Supabase admin client (or anon client with user token)
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error("Server configuration error: Missing Supabase keys");
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } }
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return res.status(401).json({ error: 'Unauthorized: Invalid token' });
    }

    // 2. Check Credits
    const { data: profile, error: profileErr } = await supabase
      .from('profiles')
      .select('credits')
      .eq('id', user.id)
      .single();

    if (profileErr || !profile || profile.credits <= 0) {
      return res.status(403).json({ error: 'Insufficient credits. Please purchase more.' });
    }

    // 3. Call OpenRouter API
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
        max_tokens: 4000,
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

    // 4. Deduct 1 Credit
    // Calling the decrement_credit RPC, which relies on the user's token
    const { error: deductErr } = await supabase.rpc('decrement_credit');
    if (deductErr) {
      console.error("Failed to deduct credit, but generation succeeded:", deductErr);
      // We still return success since the AI already generated, but log the error
    }

    res.status(200).json(data);
  } catch (err) {
    console.error("Error generating resume:", err);
    res.status(500).json({ error: err.message });
  }
};
