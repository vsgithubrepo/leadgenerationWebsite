/* eslint-disable */
// api/apollo.js — Vercel Serverless Function
// Secure proxy: keeps APOLLO_API_KEY on server, never exposes it to browser

export default async function handler(req, res) {

  // Allow CORS for local development
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  // Check API key
  const apiKey = process.env.APOLLO_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error: 'APOLLO_API_KEY is not set in Vercel environment variables.'
    });
  }

  const { endpoint, ...bodyParams } = req.body;

  // ── Apollo endpoint mapping ──────────────────────────────────────
  const APOLLO_ENDPOINTS = {
    people_search: 'https://api.apollo.io/v1/mixed_people/search',
    people_enrich: 'https://api.apollo.io/v1/people/match',
  };

  const apolloUrl = APOLLO_ENDPOINTS[endpoint];
  if (!apolloUrl) {
    return res.status(400).json({ error: `Unknown endpoint: ${endpoint}` });
  }

  // ── Build the request body ───────────────────────────────────────
  const requestBody = {
    ...bodyParams,
    api_key: apiKey,
  };

  console.log('Apollo request to:', apolloUrl);
  console.log('Apollo request body:', JSON.stringify(requestBody, null, 2));

  try {
    const apolloResponse = await fetch(apolloUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
        'X-Api-Key': apiKey,
      },
      body: JSON.stringify(requestBody),
    });

    const responseText = await apolloResponse.text();
    console.log('Apollo response status:', apolloResponse.status);
    console.log('Apollo response body:', responseText.slice(0, 500));

    let data;
    try {
      data = JSON.parse(responseText);
    } catch {
      return res.status(500).json({
        error: 'Apollo returned non-JSON response',
        details: responseText.slice(0, 300),
      });
    }

    if (!apolloResponse.ok) {
      return res.status(apolloResponse.status).json({
        error: `Apollo error ${apolloResponse.status}`,
        details: data,
      });
    }

    return res.status(200).json(data);

  } catch (err) {
    console.error('Proxy fetch error:', err);
    return res.status(500).json({
      error: 'Failed to reach Apollo API',
      details: err.message,
    });
  }
}
