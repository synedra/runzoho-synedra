const https = require('https');
const querystring = require('querystring');

exports.handler = async (event, context) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json',
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
    const { code, error, state } = event.queryStringParameters || {};

    if (error) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'OAuth authorization failed',
          details: error,
        }),
      };
    }

    if (!code) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Authorization code is required' }),
      };
    }

    const clientId = process.env.MONDAY_CLIENT_ID;
    const clientSecret = process.env.MONDAY_CLIENT_SECRET;
    const redirectUri = process.env.MONDAY_REDIRECT_URI || `https://${event.headers.host}/.netlify/functions/monday-oauth-callback`;

    if (!clientId || !clientSecret) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Monday OAuth credentials not configured' }),
      };
    }

    // Exchange authorization code for access token
    const tokenResponse = await exchangeCodeForToken(
      'https://auth.monday.com/oauth2/token',
      {
        grant_type: 'authorization_code',
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        code: code,
      }
    );

    if (tokenResponse.error) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Token exchange failed',
          details: tokenResponse.error,
        }),
      };
    }

    // Redirect to auth callback page with tokens
    const redirectUrl = `${event.headers.host.includes('localhost') ? 'http' : 'https'}://${event.headers.host}/auth/callback?provider=monday&access_token=${encodeURIComponent(tokenResponse.access_token)}&refresh_token=${encodeURIComponent(tokenResponse.refresh_token || '')}&expires_in=${tokenResponse.expires_in}&token_type=${tokenResponse.token_type}`;

    return {
      statusCode: 302,
      headers: {
        ...headers,
        Location: redirectUrl,
      },
      body: '',
    };
  } catch (error) {
    console.error('Monday OAuth callback error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};

// Helper function to exchange authorization code for access token
function exchangeCodeForToken(tokenUrl, params) {
  return new Promise((resolve, reject) => {
    const postData = querystring.stringify(params);

    const options = {
      hostname: 'auth.monday.com',
      path: '/oauth2/token',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData),
      },
    };

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          resolve(response);
        } catch (error) {
          resolve({ error: 'Invalid response from Monday' });
        }
      });
    });

    req.on('error', (error) => {
      resolve({ error: 'Network error during token exchange' });
    });

    req.write(postData);
    req.end();
  });
}