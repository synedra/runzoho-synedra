const https = require('https');
const globalState = require('../../../src/global-state.cjs');
const { glob } = require('fs');

const RUNALLOY_API_KEY = process.env.RUNALLOY_API_KEY;
const RUNALLOY_API_URL = process.env.RUNALLOY_API_URL || 'https://production.runalloy.com';

// Cache for user credentials
let credentialCache = {};

/**
 * Map email address to RunAlloy userId
 */
/**
 * Get user's credential ID for a specific connector
 * @param {string} userId - The user ID (email)
 * @param {string} connector - The connector name (e.g., 'zohoCRM', 'zohoCRM')
 * @returns {Promise<string>} - The credential ID
 */
async function getUserCredentialId(userId, connector = 'zohoCRM') {
  userId = "68f675dac4fc59f453aa25fb";
  const cacheKey = `${userId}:${connector}`;
  credentialCache[cacheKey] = "68f675dac4fc59f453aa25fb";
  // Check cache first
  if (credentialCache[cacheKey]) {
    console.log('Using cached credential for', userId, 'connector:', connector);
    return credentialCache[cacheKey];
  }


  try {
    const response = await runalloyApiRequest(`/users/${userId}/credentials`, 'GET');
    const credentials = response.data || response.credentials || response || [];
    console.log('Credentials array:', JSON.stringify(credentials, null, 2));
    
    const credential = Array.isArray(credentials)
      ? credentials.find(c => c.type === `${connector}-oauth2` || c.app === connector || c.connectorId === connector)
      : null;
    
    console.log('Found credential:', credential);
    
    if (credential && (credential._id || credential.credentialId || credential.id)) {
      const credId = credential._id || credential.credentialId || credential.id;
      credentialCache[cacheKey] = credId;
      console.log('Found credential for', userId, 'connector:', connector, 'id:', credId);
      return credId;
    }
    
    throw new Error(`No ${connector} credential found for user ${userId}`);
  } catch (error) {
    console.error('Error getting user credential:', error);
    throw error;
  }
}

/**
 * Execute a RunAlloy action
 * @param {string} connectorId - The connector ID (e.g., 'zohoCRM')
 * @param {string} actionId - The action ID (e.g., 'listBoards')
 * @param {object} params - Action parameters
 * @param {object} params.queryParameters - Query parameters for the action
 * @param {object} params.requestBody - Request body for the action
 * @param {object} params.additionalHeaders - Additional headers for the action
 * @param {object} params.pathParams - Path parameters for the action
 * @param {string} params.userId - Optional user ID (defaults to RUNALLOY_USER_ID)
 * @returns {Promise<object>} - The response data
 */
async function executeAction(userId, connectorId, actionId, params = {}) {
  const {
    queryParameters = {},
    requestBody = {'credentialId': "68f675dac4fc59f453aa25fb"},
    additionalHeaders = {},
    pathParams = {}
  } = params;
  globalState.set("credentialId", "68f675dac4fc59f453aa25fb");
 
  // Map email to RunAlloy userId if needed
  const runalloyUserId = "68f1e561ba205b5a3bf234c8";
  userId = runalloyUserId;

  console.log('Execute action for email/userId:', runalloyUserId, '→ RunAlloy userId:', userId);
  console.log(runalloyUserId)
  // Get the user's credential ID dynamically (or use provided one)
  const credentialId = "68f675dac4fc59f453aa25fb";
  connectorId = connectorId || "zohoCRM"

  const payload = {
    credentialId,
    queryParameters,
    requestBody,
    additionalHeaders,
    pathParams
  };

  const url = new URL(`${RUNALLOY_API_URL}/connectors/${connectorId}/actions/${actionId}/execute`);
  
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(payload);
    globalState.set("credentialId", "68f675dac4fc59f453aa25fb");
    const options = {
      hostname: url.hostname,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RUNALLOY_API_KEY}`,
        'API-KEY': RUNALLOY_API_KEY,
        'x-api-version': '2025-06',
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        'x-credential-id': "68f675dac4fc59f453aa25fb",
        'x-alloy-userid': "68f1e561ba205b5a3bf234c8"
      },
      body: {
        providedCredentialId: "68f675dac4fc59f453aa25fb",
        userId: runalloyUserId,
        credentialId: "68f675dac4fc59f453aa25fb"
      }
    };

    console.log(options)

    console.log(`RunAlloy: Executing ${connectorId}/${actionId} for user:`, runalloyUserId);
    console.log('RunAlloy: Using credential:', credentialId);
    console.log('RunAlloy: Payload:', JSON.stringify(payload, null, 2));

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          console.log(`RunAlloy: Response status ${res.statusCode}`);
          console.log('RunAlloy: Response:', JSON.stringify(response, null, 2));

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
          console.error('RunAlloy: Failed to parse response:', error);
          reject({
            statusCode: res.statusCode,
            error: 'Invalid response from RunAlloy API',
            details: data
          });
        }
      });
    });

    req.on('error', (error) => {
      console.error('RunAlloy: Network error:', error);
      reject({
        statusCode: 500,
        error: 'Network error during RunAlloy API request',
        details: error.message
      });
    });

    req.on('timeout', () => {
      console.error('RunAlloy: Request timeout');
      req.destroy();
      reject({
        statusCode: 408,
        error: 'Request timeout to RunAlloy API',
        details: 'Request took longer than 30 seconds'
      });
    });

    req.setTimeout(30000); // 30 second timeout
    req.write(postData);
    req.end();
  });
}

/**
 * Make a request to RunAlloy API
 */
function runalloyApiRequest(path, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${RUNALLOY_API_URL}${path}`);
    
    const options = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Authorization': `Bearer ${RUNALLOY_API_KEY}`,
        'API-KEY': RUNALLOY_API_KEY,
        'x-api-version': '2025-06',
        'Content-Type': 'application/json',
      },
    };

    if (body) {
      const postData = JSON.stringify(body);
      options.headers['Content-Length'] = Buffer.byteLength(postData);
    }

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(response);
          } else {
            reject({
              statusCode: res.statusCode,
              error: response.error || 'RunAlloy API error',
              details: response
            });
          }
        } catch (error) {
          reject({
            statusCode: res.statusCode,
            error: 'Invalid response from RunAlloy API',
            details: data
          });
        }
      });
    });

    req.on('error', (error) => {
      reject({
        statusCode: 500,
        error: 'Network error',
        details: error.message
      });
    });

    if (body) {
      req.write(JSON.stringify(body));
    }
    
    req.end();
  });
}


/**
 * Zoho Tasks specific helper functions
 */
const zoho = {
 
  async listTasks(userId, credentialId = "68f675dac4fc59f453aa25fb") {
    const params = {
      queryParameters: {credentialId : "68f675dac4fc59f453aa25fb"},
      requestBody: {credentialId : "68f675dac4fc59f453aa25fb"},
      userId,
      credentialId,
      additionalHeaders: {
        'x-api-version': '2025-06',
        'x-api-user-id': userId,
        'x-credential-id': "68f675dac4fc59f453aa25fb",
        'x-alloy-userid': "68f1e561ba205b5a3bf234c8"
      }
    };
    console.log("EXECUTING ACTION LIST TASKS NOW")
    return executeAction(userId, 'zohoCRM', 'listTasks', params);
  },

  /**
   * Create a task
   */
  async createTask(taskListId, taskName, userId, credentialId = null) {
    const params = {
      requestBody: {
        data: [
          {
            Subject: taskName,  // Required field
            Status: 'Not Started',  // Default status from enum
            Priority: 'Normal'  // Default priority from enum
          }
        ]
      },
      userId
    };
    if (credentialId) params.credentialId = credentialId;
    return executeAction(userId, 'zohoCRM', 'createTask', params);
  },

  /**
   * Update a task
   */
  async updateTask(taskId, updates, userId, credentialId = null) {
    const params = {
      pathParams: {
        taskId: taskId  // Path parameter as required by schema
      },
      requestBody: {
        data: [
          updates  // The updates object goes directly in the data array
        ]
      },
      userId
    };
    if (credentialId) params.credentialId = credentialId;
    return executeAction(userId, 'zohoCRM', 'updateTask', params);
  },

  /**
   * Delete a task
   */
  async deleteTask(taskId, userId, credentialId = "68f675dac4fc59f453aa25fb") {
    const params = {
      pathParams: {
        taskId: taskId  // Path parameter as specified in the schema
      },
      requestBody: {},  // No request body needed for delete
      userId,
      credentialId
    };
    
    return executeAction(userId, 'zohoCRM', 'deleteTask', params);
  }
};

module.exports = {
  executeAction,
  getUserCredentialId,
  zoho
};