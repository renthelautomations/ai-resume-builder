import { createClient } from '@supabase/supabase-js';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

let redis;
let ratelimit;

function getGenerationFailure(error) {
  const message = String(error?.message || error || '').toLowerCase();

  if (error?.providerStatus === 429 || /max_tokens|quota|rate limit|too many requests|usage limit|insufficient balance|requires more credits|can only afford|spend limit|provider.*limit/.test(message)) {
    return {
      status: 503,
      message: 'Resume generation is temporarily unavailable because the AI service reached its usage limit. Please try again later.'
    };
  }

  if (/json|parse|invalid response|incomplete ai response/.test(message)) {
    return {
      status: 502,
      message: "We received an incomplete AI response. Please try again."
    };
  }

  return {
    status: 500,
    message: "We couldn't generate your resume right now. Please try again."
  };
}

export default async function handler(req, res) {
  if (!redis) {
    redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });
    ratelimit = new Ratelimit({
      redis: redis,
      limiter: Ratelimit.slidingWindow(5, "1 m"),
      analytics: true,
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'This request method is not supported.' });
  }

  try {
    // 0. Check Rate Limit
    // Extract IP address from headers (Vercel uses x-forwarded-for)
    const ip = req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || req.socket?.remoteAddress || '127.0.0.1';
    
    const { success, limit, reset, remaining } = await ratelimit.limit(`ratelimit_${ip}`);
    
    // Optional: Add rate limit headers to the response
    res.setHeader('X-RateLimit-Limit', limit);
    res.setHeader('X-RateLimit-Remaining', remaining);
    res.setHeader('X-RateLimit-Reset', reset);
    
    if (!success) {
      console.warn(`Rate limit exceeded for IP: ${ip}`);
      return res.status(429).json({ error: 'Too many resume requests. Please wait a minute and try again.' });
    }

    const { systemPrompt, userMsg } = req.body;
    
    // 1. Verify User Authentication
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Please sign in to generate a resume.' });
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

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      console.error('Resume generation authentication failed:', {
        code: authError?.code,
        status: authError?.status
      });
      return res.status(401).json({ error: 'Your session expired. Please sign in again.' });
    }

    // 2. Check Credits
    const { data: profile, error: profileErr } = await supabase
      .from('profiles')
      .select('credits')
      .eq('id', user.id)
      .single();

    if (profileErr) {
      console.error('Resume credit lookup failed:', {
        code: profileErr.code,
        status: profileErr.status
      });
      return res.status(503).json({ error: "We couldn't verify your credits right now. Please try again." });
    }

    if (!profile || profile.credits <= 0) {
      return res.status(403).json({ error: "You don't have enough credits to generate a resume. Add credits and try again." });
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
        model: "deepseek/deepseek-v4-flash",
        max_tokens: 8000,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMsg }
        ]
      })
    });

    const data = await response.json();
    if (!response.ok || data.error) {
      const providerMessage = typeof data?.error === 'string'
        ? data.error
        : data?.error?.message || data?.error?.code || `Provider returned HTTP ${response.status}`;
      const providerError = new Error(providerMessage);
      providerError.providerStatus = response.status;
      throw providerError;
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
    const failure = getGenerationFailure(err);
    console.error('Resume generation failed:', {
      providerStatus: err?.providerStatus,
      errorName: err?.name,
      responseStatus: failure.status
    });
    res.status(failure.status).json({ error: failure.message });
  }
};
