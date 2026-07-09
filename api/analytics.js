export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // We will fetch analytics from the last 30 days
    const to = Date.now();
    const from = to - (30 * 24 * 60 * 60 * 1000);

    const projectId = 'prj_1kuN0iaNEMKxf9OXWuyzvPHVp29P';
    const teamId = 'team_6p9HCzHfXLgeJ6Uw6jpCcBMb';
    const token = process.env.VERCEL_ACCESS_TOKEN;

    if (!token) {
      console.error('Missing VERCEL_ACCESS_TOKEN');
      return res.status(500).json({ error: 'Server misconfiguration' });
    }

    const url = `https://api.vercel.com/v1/query/web-analytics/visits/count?projectId=${projectId}&teamId=${teamId}&from=${from}&to=${to}`;
    
    const vercelRes = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (!vercelRes.ok) {
      const errText = await vercelRes.text();
      console.error('Vercel API error:', vercelRes.status, errText);
      // Graceful degradation: if analytics isn't enabled yet, return 0 instead of crashing the dashboard
      if (vercelRes.status === 404) {
        return res.status(200).json({ pageViews: 0, visitors: 0 });
      }
      return res.status(vercelRes.status).json({ error: 'Failed to fetch analytics from Vercel' });
    }

    const data = await vercelRes.json();
    
    // Vercel returns an object like { total: 1234 }
    // Wait, let's just pass whatever it returns. If it returns something else, we will map it.
    // Based on standard Vercel API, it might return an object with data points.
    // Since we are using an undocumented Vercel API, we'll return the raw data and let the frontend parse it.
    
    res.status(200).json(data);
  } catch (error) {
    console.error('API Route Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}
