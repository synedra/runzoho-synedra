const querystring = require('querystring');
const https = require('https');

exports.handler = async (event, context) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  };

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: '',
    };
  }

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    const clientId = process.env.MONDAY_CLIENT_ID;
    const redirectUri = "https://runalloy.netlify.app/.netlify/functions/monday-oauth-callback";

    if (!clientId) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Monday client ID not configured' }),
      };
    }

    // Monday.com OAuth scopes for basic integration
    const scopes = 'boards:read updates:read updates:write boards:write me:read';

    console.log('Monday OAuth init - client_id:', clientId);
    console.log('Monday OAuth init - redirect_uri:', redirectUri);

    const authUrl = `https://auth.monday.com/oauth2/authorize?${querystring.stringify({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: scopes,
    })}`;

    console.log('Monday OAuth auth URL:', authUrl);

    return {
      statusCode: 302,
      headers: {
        ...headers,
        Location: authUrl,
      },
      body: '',
    };
  } catch (error) {
    console.error('Monday OAuth init error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};

