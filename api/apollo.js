// ─────────────────────────────────────────────────────────────────────────────
// api/apollo.js  —  Vercel Serverless Function
//
// This file runs on the SERVER (not in the browser).
// Your Apollo API key is stored here safely and is NEVER visible to users.
//
// How it works:
//   1. Your React app calls  POST /api/apollo  (your own server)
//   2. This function adds the secret API key and forwards to Apollo
//   3. Apollo responds with real leads
//   4. This function sends the leads back to your React app
//
// The user's browser only ever sees /api/apollo — they never see the real key.
// ─────────────────────────────────────────────────────────────────────────────

export default async function handler(req, res) {

  // ── Only allow POST requests ────────────────────────────────────
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  // ── Check the Apollo API key is configured ──────────────────────
  const apiKey = process.env.APOLLO_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error: 'APOLLO_API_KEY is not set in Vercel environment variables.'
    });
  }

  // ── Get which Apollo endpoint to call ──────────────────────────
  // The React app sends { endpoint: 'people_search', ...searchParams }
  const { endpoint, ...bodyParams } = req.body;

  // Map endpoint names to real Apollo URLs
  const APOLLO_ENDPOINTS = {
    people_search: 'https://api.apollo.io/api/v1/mixed_people/api_search',
    people_enrich: 'https://api.apollo.io/api/v1/people/match',
  };

  const apolloUrl = APOLLO_ENDPOINTS[endpoint];
  if (!apolloUrl) {
    return res.status(400).json({ error: `Unknown endpoint: ${endpoint}` });
  }

  // ── Forward the request to Apollo with the secret key ──────────
  try {
    const apolloResponse = await fetch(apolloUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
      },
      body: JSON.stringify({
        ...bodyParams,
        api_key: apiKey,   // ✅ Key is added here on the server — never in the browser
      }),
    });

    // If Apollo returned an error, forward it
    if (!apolloResponse.ok) {
      const errorText = await apolloResponse.text();
      console.error('Apollo API error:', apolloResponse.status, errorText);
      return res.status(apolloResponse.status).json({
        error: `Apollo returned error ${apolloResponse.status}`,
        details: errorText,
      });
    }

    // ── Return Apollo's response back to the React app ──────────
    const data = await apolloResponse.json();
    return res.status(200).json(data);

  } catch (err) {
    console.error('Proxy fetch error:', err);
    return res.status(500).json({ error: 'Failed to reach Apollo API', details: err.message });
  }
}
