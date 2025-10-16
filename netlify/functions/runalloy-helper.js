const https = require('https');

const RUNALLOY_API_KEY = process.env.RUNALLOY_API_KEY;
const RUNALLOY_API_URL = process.env.RUNALLOY_API_URL || 'https://production.runalloy.com';

// Cache for user credentials
let credentialCache = {};

/**
 * Map email address to RunAlloy userId
 */
function getUserIdFromEmail(email) {
  if (!email) return null;
  
  // Use base64 encoding to avoid special characters in env var names
  const base64Email = Buffer.from(email).toString('base64');
  const envVarName = `RUNALLOY_USER_${base64Email}`;
  
  const userId = process.env[envVarName];
  console.log(`Mapping email ${email} via ${envVarName}:`, userId ? userId : 'not found');
  
  return userId;
}

/**
 * Get user's credential ID for Monday.com
 * @param {string} userId - The user ID (email)
 * @returns {Promise<string>} - The credential ID
 */
async function getUserCredentialId(userId) {
  const cacheKey = `${userId}:monday`;
  
  // Check cache first
  if (credentialCache[cacheKey]) {
    console.log('Using cached credential for', userId);
    return credentialCache[cacheKey];
  }

  try {
    const response = await runalloyApiRequest(`/users/${userId}/credentials`, 'GET');
    const credentials = response.credentials || response || [];
    const mondayCredential = Array.isArray(credentials)
      ? credentials.find(c => c.app === 'monday' || c.connectorId === 'monday')
      : null;
    
    if (mondayCredential && (mondayCredential._id || mondayCredential.credentialId || mondayCredential.id)) {
      const credId = mondayCredential._id || mondayCredential.credentialId || mondayCredential.id;
      credentialCache[cacheKey] = credId;
      console.log('Found credential for', userId, ':', credId);
      return credId;
    }
    
    throw new Error(`No Monday.com credential found for user ${userId}`);
  } catch (error) {
    console.error('Error getting user credential:', error);
    throw error;
  }
}

/**
 * Execute a RunAlloy action
 * @param {string} connectorId - The connector ID (e.g., 'monday')
 * @param {string} actionId - The action ID (e.g., 'listBoards')
 * @param {object} params - Action parameters
 * @param {object} params.queryParameters - Query parameters for the action
 * @param {object} params.requestBody - Request body for the action
 * @param {object} params.additionalHeaders - Additional headers for the action
 * @param {object} params.pathParams - Path parameters for the action
 * @param {string} params.userId - Optional user ID (defaults to RUNALLOY_USER_ID)
 * @returns {Promise<object>} - The response data
 */
async function executeAction(connectorId, actionId, params = {}) {
  const {
    queryParameters = {},
    requestBody = {},
    additionalHeaders = {},
    pathParams = {},
    userId: emailOrUserId
  } = params;

  // Map email to RunAlloy userId if needed
  const runalloyUserId = getUserIdFromEmail(emailOrUserId) || emailOrUserId;
  console.log('Execute action for email/userId:', emailOrUserId, '→ RunAlloy userId:', runalloyUserId);

  // Get the user's credential ID dynamically
  const credentialId = await getUserCredentialId(runalloyUserId);

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

    const options = {
      hostname: url.hostname,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RUNALLOY_API_KEY}`,
        'API-KEY': RUNALLOY_API_KEY,
        'x-api-version': '2025-06',
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

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
 * Monday.com specific helper functions
 */
const monday = {
  /**
   * List all boards
   */
  async listBoards(userId) {
    return executeAction('monday', 'listBoards', {
      queryParameters: {},
      requestBody: {},
      userId
    });
  },

  /**
   * Create a new board
   */
  async createBoard(name, userId) {
    return executeAction('monday', 'createBoard', {
      requestBody: {
        board_name: name,
        board_kind: 'public'
      },
      userId
    });
  },

  /**
   * Update a board
   */
  async updateBoard(boardId, name, userId) {
    return executeAction('monday', 'updateBoard', {
      requestBody: {
        board_id: boardId,
        board_attribute: 'name',
        new_value: name
      },
      userId
    });
  },

  /**
   * Delete a board
   */
  async deleteBoard(boardId, userId) {
    return executeAction('monday', 'deleteBoard', {
      requestBody: {
        board_id: boardId
      },
      userId
    });
  },

  /**
   * List items in a board
   */
  async listItems(boardId, userId) {
    return executeAction('monday', 'listItems', {
      queryParameters: {
        board_id: boardId
      },
      userId
    });
  },

  /**
   * Create an item
   */
  async createItem(boardId, itemName, userId) {
    return executeAction('monday', 'createItem', {
      requestBody: {
        board_id: boardId,
        item_name: itemName
      },
      userId
    });
  },

  /**
   * Update an item
   */
  async updateItem(itemId, updates, userId) {
    return executeAction('monday', 'updateItem', {
      requestBody: {
        item_id: itemId,
        ...updates
      },
      userId
    });
  },

  /**
   * Delete an item
   */
  async deleteItem(itemId, userId) {
    return executeAction('monday', 'deleteItem', {
      requestBody: {
        item_id: itemId
      },
      userId
    });
  }
};

module.exports = {
  executeAction,
  getUserCredentialId,
  monday
};