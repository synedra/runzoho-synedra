const { monday } = require('./runalloy-helper');

exports.handler = async (event, context) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
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

  try {
    // Get userId from query parameters (user's email)
    const userId = event.queryStringParameters?.userId;
    
    switch (event.httpMethod) {
      case 'GET':
        return await getBoards(userId, headers);
      case 'POST':
        return await createBoard(JSON.parse(event.body), userId, headers);
      case 'PUT':
        return await updateBoard(JSON.parse(event.body), userId, headers);
      case 'DELETE':
        const boardId = event.queryStringParameters?.boardId;
        return await deleteBoard(boardId, userId, headers);
      default:
        return {
          statusCode: 405,
          headers,
          body: JSON.stringify({ error: 'Method not allowed' }),
        };
    }
  } catch (error) {
    console.error('Monday boards error:', error);
    return {
      statusCode: error.statusCode || 500,
      headers,
      body: JSON.stringify({ 
        error: error.error || 'Internal server error',
        details: error.details 
      }),
    };
  }
};

async function getBoards(userId, headers) {
  console.log('monday-boards: getBoards called via RunAlloy for user:', userId);

  try {
    const response = await monday.listBoards(userId);
    
    // Extract boards from RunAlloy response
    // The actual structure depends on what RunAlloy returns
    const boards = response.responseData?.data?.boards || response.data?.boards || [];
    
    console.log('monday-boards: Found', boards.length, 'boards');

    // Sort by updated_at descending if available
    if (boards.length > 0 && boards[0].updated_at) {
      boards.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ data: boards }),
    };
  } catch (error) {
    console.error('monday-boards: Error fetching boards:', error);
    throw error;
  }
}

async function createBoard(boardData, userId, headers) {
  const { name } = boardData;
  
  console.log('monday-boards: createBoard called with name:', name, 'for user:', userId);

  try {
    const response = await monday.createBoard(name, userId);
    
    const board = response.responseData?.data?.create_board || response.data?.create_board;

    return {
      statusCode: 201,
      headers,
      body: JSON.stringify({ data: board }),
    };
  } catch (error) {
    console.error('monday-boards: Error creating board:', error);
    throw error;
  }
}

async function updateBoard(boardData, userId, headers) {
  const { id, name } = boardData;

  console.log('monday-boards: updateBoard called with:', { id, name }, 'for user:', userId);

  try {
    const response = await monday.updateBoard(id, name, userId);
    
    const board = response.responseData?.data?.update_board || response.data?.update_board;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ data: board }),
    };
  } catch (error) {
    console.error('monday-boards: Error updating board:', error);
    throw error;
  }
}

async function deleteBoard(boardId, userId, headers) {
  if (!boardId) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Board ID is required' }),
    };
  }

  console.log('monday-boards: deleteBoard called with id:', boardId, 'for user:', userId);

  try {
    const response = await monday.deleteBoard(boardId, userId);
    
    const result = response.responseData?.data?.delete_board || response.data?.delete_board;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ data: result }),
    };
  } catch (error) {
    console.error('monday-boards: Error deleting board:', error);
    throw error;
  }
}