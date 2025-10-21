const RUNALLOY_API_KEY = process.env.RUNALLOY_API_KEY;
const RUNALLOY_API_URL = process.env.RUNALLOY_API_URL || 'https://production.runalloy.com';
const RUNALLOY_USER_ID = process.env.RUNALLOY_USER_ID || 'default_user';
const globalState = require('../../src/global-state.cjs');

console.log('Zoho Auth - RUNALLOY_API_KEY present:', !!RUNALLOY_API_KEY);
console.log('Zoho Auth - API key length:', RUNALLOY_API_KEY ? RUNALLOY_API_KEY.length : 0);

exports.handler = async (event) => {
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
    const { action, email } = event.queryStringParameters || {};
    globalState.set("user_email", email)
    // Handle OAuth callback (no action/userId params)
    if (!action && !email) {
      console.log('OAuth callback detected - no action/userId params');
      return {
        statusCode: 302,
        headers: {
          ...headers,
          'Location': 'https://runzoho.netlify.app/?auth=success',
        },
        body: ''
      };
    }
    
    const runalloyUserId = globalState.get("userId") || RUNALLOY_USER_ID;
    console.log(runalloyUserId);
    console.log(action);
    
    if (!action || !email) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing action or userId parameter' })
      };
    }
    console.log('Action:', action, 'Email:', email);

    // Map email to RunAlloy userId
    console.log('Mapping email ', email, 'to RunAlloy userId:', runalloyUserId);

    switch (action) {
      case 'get-credential':
        return globalState.get("credentialId")
      default:
        console.log('Invalid action received:', action, 'query params:', event.queryStringParameters);
        // If no action is provided, assume it's an OAuth callback and redirect to the main app
        if (!action && event.httpMethod === 'GET') {
          console.log('No action provided, assuming OAuth callback, redirecting to main app');
          return {
            statusCode: 302,
            headers: {
              ...headers,
              'Location':'https://runzoho.netlify.app/?auth=success',
            },
            body: ''
          };
        }
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Invalid action:' + action }),
        };
    }
  } catch (error) {
    console.error('RunAlloy auth error:', JSON.stringify(error, null, 2));
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Internal server error',
        details: error.message,
        fullError: error
      }),
    };
  }
}