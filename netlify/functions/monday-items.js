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
    const { boardId, itemId, userId } = event.queryStringParameters || {};

    // Board ID is required for GET and POST
    if (!boardId && (event.httpMethod === 'GET' || event.httpMethod === 'POST')) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Board ID is required' }),
      };
    }

    switch (event.httpMethod) {
      case 'GET':
        return await getItems(boardId, userId, headers);
      case 'POST':
        return await createItem(boardId, JSON.parse(event.body), userId, headers);
      case 'PUT':
        return await updateItem(JSON.parse(event.body), userId, headers);
      case 'DELETE':
        return await deleteItem(itemId, userId, headers);
      default:
        return {
          statusCode: 405,
          headers,
          body: JSON.stringify({ error: 'Method not allowed' }),
        };
    }
  } catch (error) {
    console.error('Monday items error:', error);
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

async function getItems(boardId, userId, headers) {
  console.log('monday-items: getItems called for boardId:', boardId, 'user:', userId);

  try {
    const response = await monday.listItems(boardId, userId);
    
    // Extract items from RunAlloy response
    const items = response.responseData?.data?.boards?.[0]?.items_page?.items || 
                  response.data?.boards?.[0]?.items_page?.items || 
                  [];
    
    console.log('monday-items: Found', items.length, 'items for board', boardId);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ data: items }),
    };
  } catch (error) {
    console.error('monday-items: Error fetching items:', error);
    throw error;
  }
}

async function createItem(boardId, itemData, userId, headers) {
  const { name } = itemData;
  
  console.log('monday-items: createItem called with:', { boardId, name, userId });

  try {
    const response = await monday.createItem(boardId, name, userId);
    
    const item = response.responseData?.data?.create_item || response.data?.create_item;

    return {
      statusCode: 201,
      headers,
      body: JSON.stringify({ data: item }),
    };
  } catch (error) {
    console.error('monday-items: Error creating item:', error);
    throw error;
  }
}

async function updateItem(itemData, userId, headers) {
  const { id, name, boardId, columnValues } = itemData;

  console.log('monday-items: updateItem called with:', { id, name, boardId, columnValues, userId });

  try {
    const updates = {};
    
    if (name !== undefined) {
      updates.item_name = name;
    }
    
    if (boardId !== undefined) {
      updates.board_id = boardId;
    }
    
    if (columnValues !== undefined) {
      updates.column_values = columnValues;
    }

    const response = await monday.updateItem(id, updates, userId);
    
    const result = response.responseData?.data || response.data;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ data: result }),
    };
  } catch (error) {
    console.error('monday-items: Error updating item:', error);
    throw error;
  }
}

async function deleteItem(itemId, userId, headers) {
  if (!itemId) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Item ID is required' }),
    };
  }

  console.log('monday-items: deleteItem called with id:', itemId, 'user:', userId);

  try {
    const response = await monday.deleteItem(itemId, userId);
    
    const result = response.responseData?.data?.delete_item || response.data?.delete_item;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ data: result }),
    };
  } catch (error) {
    console.error('monday-items: Error deleting item:', error);
    throw error;
  }
}