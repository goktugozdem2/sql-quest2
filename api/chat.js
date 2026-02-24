const https = require('https');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  
  // GET = health check so you can test in browser
  if (req.method === 'GET') {
    const hasKey = !!process.env.ANTHROPIC_API_KEY;
    const keyPrefix = hasKey ? process.env.ANTHROPIC_API_KEY.substring(0, 10) + '...' : 'NOT SET';
    return res.status(200).json({ 
      status: 'ok', 
      hasKey: hasKey,
      keyPrefix: keyPrefix,
      nodeVersion: process.version
    });
  }

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
  if (!ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY env var not set in Vercel' });
  }

  try {
    const { messages, system, max_tokens } = req.body || {};

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'messages array required', received: typeof req.body });
    }

    const postData = JSON.stringify({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: Math.min(max_tokens || 1000, 2000),
      system: system || 'You are a helpful SQL tutor.',
      messages: messages
    });

    const data = await new Promise((resolve, reject) => {
      const request = https.request({
        hostname: 'api.anthropic.com',
        path: '/v1/messages',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
          'Content-Length': Buffer.byteLength(postData)
        }
      }, (response) => {
        let body = '';
        response.on('data', (chunk) => { body += chunk; });
        response.on('end', () => {
          try {
            resolve({ status: response.statusCode, data: JSON.parse(body) });
          } catch (e) {
            resolve({ status: response.statusCode, data: { error: { message: 'Parse error: ' + body.substring(0, 200) } } });
          }
        });
      });

      request.on('error', (e) => reject(e));
      request.setTimeout(25000, () => { request.destroy(); reject(new Error('Timeout')); });
      request.write(postData);
      request.end();
    });

    if (data.status !== 200) {
      return res.status(data.status).json(data.data);
    }

    return res.status(200).json(data.data);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
