const https = require('https');

const RUNALLOY_API_KEY = process.env.RUNALLOY_API_KEY;
const RUNALLOY_API_URL = process.env.RUNALLOY_API_URL || 'https://production.runalloy.com';
const RUNALLOY_USER_ID = process.env.RUNALLOY_USER_ID || 'default_user';

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const { action, userId } = event.queryStringParameters || {};
    const effectiveUserId = userId || RUNALLOY_USER_ID;

    switch (action) {
      case 'create-link':
        return await createEmbeddedLink(effectiveUserId, headers);
      case 'get-credential':
        return await getUserCredential(effectiveUserId, headers);
      case 'check-status':
        return await checkCredentialStatus(effectiveUserId, headers);
      default:
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Invalid action' }),
        };
    }
  } catch (error) {
    console.error('RunAlloy auth error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Internal server error',
        details: error.message 
      }),
    };
  }
};

async function createEmbeddedLink(userId, headers) {
  console.log('Creating credential for user:', userId);

  // Match the exact format from the successful curl command
  const payload = {
    userId: userId,
    authenticationType: 'oauth2',
    redirectUri: process.env.URL || 'https://runalloy.netlify.app'
  };

  try {
    console.log('Sending payload:', JSON.stringify(payload, null, 2));
    const response = await runalloyApiRequest('/connectors/monday/credentials', 'POST', payload);
    
    console.log('Credential creation response:', JSON.stringify(response, null, 2));

    if (!response.oauthUrl) {
      console.error('No oauthUrl in response:', response);
      throw new Error('Invalid response from RunAlloy - missing oauthUrl');
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        linkUrl: response.oauthUrl,
        userId: userId
      }),
    };
  } catch (error) {
    console.error('Error creating credential:', error);
    console.error('Error details:', JSON.stringify(error, null, 2));
    throw error;
  }
}

async function getUserCredential(userId, headers) {
  console.log('Getting credentials for user:', userId);

  try {
    const response = await runalloyApiRequest(`/users/${userId}/credentials`, 'GET');
    
    const credentials = response.credentials || response || [];
    const mondayCredential = Array.isArray(credentials)
      ? credentials.find(c => c.app === 'monday' || c.connectorId === 'monday')
      : null;

    if (mondayCredential) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          hasCredential: true,
          credentialId: mondayCredential._id || mondayCredential.credentialId || mondayCredential.id,
          status: mondayCredential.status || 'active'
        }),
      };
    } else {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          hasCredential: false
        }),
      };
    }
  } catch (error) {
    console.error('Error getting user credential:', error);
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        hasCredential: false,
        error: error.message
      }),
    };
  }
}

async function checkCredentialStatus(userId, headers) {
  return getUserCredential(userId, headers);
}

function runalloyApiRequest(path, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const fullUrl = `${RUNALLOY_API_URL}${path}`;
    console.log('Full URL:', fullUrl);
    const url = new URL(fullUrl);
    
    const options = {
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname + url.search,
      method: method,
      headers: {
        'API-KEY': RUNALLOY_API_KEY,
        'x-api-version': '2025-06',
        'Content-Type': 'application/json',
      },
    };

    if (body) {
      const postData = JSON.stringify(body);
      options.headers['Content-Length'] = Buffer.byteLength(postData);
    }

    console.log(`RunAlloy API: ${method} ${fullUrl}`);
    console.log('Options:', JSON.stringify({ hostname: options.hostname, port: options.port, path: options.path, method: options.method }, null, 2));
    console.log('Using API key:', RUNALLOY_API_KEY ? `${RUNALLOY_API_KEY.substring(0, 8)}...` : 'MISSING');

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          console.log(`RunAlloy API Response (${res.statusCode}):`, response);

          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(response);
          } else {
            reject({
              statusCode: res.statusCode,
              error: response.error || response.message || 'RunAlloy API error',
              details: response
            });
          }
        } catch (error) {
          console.error('Failed to parse RunAlloy response:', error);
          reject({
            statusCode: res.statusCode,
            error: 'Invalid response from RunAlloy API',
            details: data
          });
        }
      });
    });

    req.on('error', (error) => {
      console.error('RunAlloy API network error:', error);
      reject({
        statusCode: 500,
        error: 'Network error during RunAlloy API request',
        details: error.message
      });
    });

    if (body) {
      req.write(JSON.stringify(body));
    }
    
    req.end();
  });
}