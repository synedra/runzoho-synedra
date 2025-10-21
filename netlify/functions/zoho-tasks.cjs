const { zoho } = require('./helpers/runalloy-helper.cjs');
const globalState = require('../../src/global-state.cjs');

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
    const { taskId, userId } = event.queryStringParameters || {};

    globalState.set("userId", "68f1e561ba205b5a3bf234c8");
    globalState.set("credentialId", "68f675dac4fc59f453aa25fb");

    switch (event.httpMethod) {
        case 'GET':
          return await listTasks(globalState.get("userId"), globalState.get("credentialId"), headers);
        case 'POST':
          return await createTask(JSON.parse(event.body), userId, headers);
        case 'PUT':
          return await updateTask(JSON.parse(event.body), userId, headers);
        case 'DELETE':
          return await deleteTask(taskId, userId, headers);
        default:
          return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: 'Method not allowed' }),
          };
      }
    
  } catch (error) {
    console.error('Zoho tasks error:', error);
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

async function listTasks(userId, credentialId, headers) {
  console.log('zoho-tasks: listTasks called for ', 'user:', userId, 'and credential:', credentialId);

  try {
    const response = await zoho.listTasks(userId);

    // Extract tasks from RunAlloy response
    const tasks = response.responseData?.data?.tasks ||
                  response.data?.tasks ||
                  response.responseData?.data ||
                  response.data || [];

    console.log('Raw tasks from Zoho:', JSON.stringify(tasks, null, 2));

    console.log('zoho-tasks: Found', Array.isArray(tasks) ? tasks.length : 'unknown', 'tasks');

    // Transform Zoho CRM tasks to match expected item format with column_values
    const transformedTasks = Array.isArray(tasks) ? tasks.map(task => {
      // Extract status - map Zoho statuses to our UI format
      const zohoStatus = task.Status || 'Not Started';
      const uiStatus = zohoStatus === 'Completed' ? 'Done' : 'Working on it';
      
      // Extract priority for additional display info
      const priority = task.Priority || 'Normal';
      
      // Extract due date for display
      const dueDate = task.Due_Date || null;
      
      return {
        id: task.id,
        name: task.Subject || task.name || 'Untitled Task',
        description: task.Description || '',
        dueDate: dueDate,
        priority: priority,
        status: zohoStatus,
        owner: task.Owner?.name || 'Unassigned',
        modifiedTime: task.Modified_Time,
        createdTime: task.Created_Time,
        column_values: [
          {
            id: 'status',
            text: uiStatus,
            type: 'status'
          },
          {
            id: 'priority',
            text: priority,
            type: 'priority'
          },
          {
            id: 'due_date',
            text: dueDate || 'No due date',
            type: 'date'
          },
          {
            id: 'owner',
            text: task.Owner?.name || 'Unassigned',
            type: 'person'
          }
        ]
      };
    }) : [];

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ data: transformedTasks }),
    };
  } catch (error) {
    console.error('zoho-tasks: Error fetching tasks:', error);
    throw error;
  }
}

async function createTask(taskData, userId, headers) {
  const { name } = taskData;

  console.log('zoho-tasks: createTask called with:', { name, userId });

  try {
    // For Zoho CRM, we might not need a taskListId, or use a default one
    // Let's try without taskListId first, or use a default
    const response = await zoho.createTask(null, name, userId);

    const task = response.responseData?.data?.task ||
                 response.data?.task ||
                 response.responseData?.data ||
                 response.data;

    return {
      statusCode: 201,
      headers,
      body: JSON.stringify({ data: task }),
    };
  } catch (error) {
    console.error('zoho-tasks: Error creating task:', error);
    throw error;
  }
}

async function updateTask(taskData, userId, headers) {
  const { id, name, columnValues } = taskData;

  console.log('zoho-tasks: updateTask called with:', { id, name, columnValues, userId });

  try {
    const updates = {};

    if (name !== undefined) {
      // For Zoho CRM tasks, the field is 'Subject', not 'task_name'
      updates.Subject = name;
    }

    if (columnValues !== undefined && Array.isArray(columnValues)) {
      // Handle status updates - map UI status to Zoho CRM status enum
      const statusColumn = columnValues.find(col => col.id === 'status');
      if (statusColumn) {
        // Map UI status values to Zoho CRM enum values
        if (statusColumn.text === 'Done') {
          updates.Status = 'Completed';
        } else if (statusColumn.text === 'Working on it') {
          updates.Status = 'In Progress';
        } else {
          updates.Status = statusColumn.text; // Use as-is if it's already a valid Zoho status
        }
      }
    }

    console.log('zoho-tasks: Sending updates to Zoho:', updates);

    const response = await zoho.updateTask(id, updates, userId);

    const result = response.responseData?.data ||
                   response.data ||
                   response;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ data: result }),
    };
  } catch (error) {
    console.error('zoho-tasks: Error updating task:', error);
    throw error;
  }
}

async function deleteTask(taskId, userId, headers) {
  userId = "68f1e561ba205b5a3bf234c8";
  
  if (!taskId) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Task ID is required' }),
    };
  }

  console.log('zoho-tasks: deleteTask called with id:', taskId, 'user:', userId);

  try {
    const response = await zoho.deleteTask(taskId, userId);
    console.log('zoho-tasks: Delete response:', JSON.stringify(response, null, 2));

    const result = response.responseData?.data ||
                   response.data ||
                   response;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ data: result }),
    };
  } catch (error) {
    console.error('zoho-tasks: Error deleting task:', error);
    throw error;
  }
}

