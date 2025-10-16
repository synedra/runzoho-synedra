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
  console.log('Creating embedded link for user:', userId);

  const payload = {
    userId: userId,
    connectorId: 'monday',
    redirectUrl: `${process.env.URL || 'http://localhost:8888'}`,
  };

  try {
    const response = await runalloyApiRequest('/embedded/links', 'POST', payload);
    
    console.log('Embedded link created:', response);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        linkUrl: response.linkUrl,
        userId: userId
      }),
    };
  } catch (error) {
    console.error('Error creating embedded link:', error);
    throw error;
  }
}

async function getUserCredential(userId, headers) {
  console.log('Getting credential for user:', userId);

  try {
    const response = await runalloyApiRequest(`/users/${userId}/credentials?connectorId=monday`, 'GET');
    
    const credentials = response.credentials || [];
    const mondayCredential = credentials.find(c => c.connectorId === 'monday');

    if (mondayCredential) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          hasCredential: true,
          credentialId: mondayCredential.credentialId,
          status: mondayCredential.status
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
    throw error;
  }
}

async function checkCredentialStatus(userId, headers) {
  console.log('Checking credential status for user:', userId);

  try {
    const response = await runalloyApiRequest(`/users/${userId}/credentials?connectorId=monday`, 'GET');
    
    const credentials = response.credentials || [];
    const mondayCredential = credentials.find(c => c.connectorId === 'monday');

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        hasCredential: !!mondayCredential,
        credentialId: mondayCredential?.credentialId,
        status: mondayCredential?.status || 'not_found'
      }),
    };
  } catch (error) {
    console.error('Error checking credential status:', error);
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        hasCredential: false,
        status: 'error',
        error: error.message
      }),
    };
  }
}

function runalloyApiRequest(path, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${RUNALLOY_API_URL}${path}`);
    
    const options = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Authorization': `Bearer ${RUNALLOY_API_KEY}`,
        'x-api-version': '2025-06',
        'Content-Type': 'application/json',
      },
    };

    if (body) {
      const postData = JSON.stringify(body);
      options.headers['Content-Length'] = Buffer.byteLength(postData);
    }

    console.log(`RunAlloy API: ${method} ${path}`);

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