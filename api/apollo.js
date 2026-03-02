/* eslint-disable */
// api/apollo.js — Vercel Serverless Function
// Runs on the server — APOLLO_API_KEY is never sent to the browser

export default async function handler(req, res) {

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  const apiKey = process.env.APOLLO_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'APOLLO_API_KEY not set in Vercel environment variables.' });
  }

  const { endpoint, ...bodyParams } = req.body;

  const APOLLO_ENDPOINTS = {
    people_search: 'https://api.apollo.io/v1/mixed_people/search',
    people_enrich: 'https://api.apollo.io/v1/people/match',
  };

  const apolloUrl = APOLLO_ENDPOINTS[endpoint];
  if (!apolloUrl) {
    return res.status(400).json({ error: 'Unknown endpoint: ' + endpoint });
  }

  try {
    const apolloResponse = await fetch(apolloUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
        'X-Api-Key': apiKey,
      },
      body: JSON.stringify({ ...bodyParams, api_key: apiKey }),
    });

    const responseText = await apolloResponse.text();

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseErr) {
      return res.status(500).json({
        error: 'Apollo returned non-JSON response',
        details: responseText.slice(0, 300),
      });
    }

    if (!apolloResponse.ok) {
      return res.status(apolloResponse.status).json({
        error: 'Apollo error ' + apolloResponse.status,
        details: data,
      });
    }

    return res.status(200).json(data);

  } catch (err) {
    return res.status(500).json({ error: 'Failed to reach Apollo API', details: err.message });
  }
}
