# Zoho CRM Tasks Integration Guide

This application uses Zoho CRM Tasks as the backend for a simplified todo list functionality, integrated through RunAlloy.

## Overview

The application routes all requests through RunAlloy's connector system to interact with Zoho CRM Tasks module. This provides several benefits:

- **Centralized Authentication**: RunAlloy manages OAuth credentials and tokens for Zoho
- **Connectivity API**: Consistent interface across different connectors
- **Better Error Handling**: Standardized error responses
- **Rate Limiting**: Built-in rate limit management
- **Monitoring**: Track API usage through RunAlloy dashboard

## Architecture

```
Frontend (React) - Single Task List
    ↓
Netlify Functions (zoho-tasks.cjs)
    ↓
RunAlloy Helper (runalloy-helper.cjs)
    ↓
RunAlloy API
    ↓
Zoho CRM Tasks Module
```

## Setup

### 1. Environment Variables

#### a. Get Your Credentials

1. **RunAlloy API Key**: Get from RunAlloy dashboard → Settings → API Keys
2. **Zoho CRM Connector**: Configure the Zoho CRM connector in RunAlloy dashboard
3. **Zoho OAuth Credentials**: These are used by RunAlloy internally for the Zoho CRM connector

#### b. Set Your Environment Variables
Add these variables to your `.env` file:

```bash
# RunAlloy API Configuration
RUNALLOY_API_KEY=your_api_key_here
RUNALLOY_API_URL=https://production.runalloy.com

# Zoho OAuth Configuration (for reference)
ZOHO_CLIENT_ID=your_zoho_client_id
ZOHO_CLIENT_SECRET=your_zoho_client_secret
```

### 2. Setup httpie

Curl is kind of a pain for making API calls, as you need to set the headers separately each time.  We'll use 'httpie', a command line option that allows you to set up your headers for every call.

1. **Install [Httpie](https://httpie.io/cli)**
2. **Setup httpie session**

Create your config file.  This instructs httpie to use the correct header file for each command.

```json
{
	"default_options": [
	    "--session-read-only=~/.config/httpie/default_headers_session.json"
	]
    }
```

Save this as `~/.config/httpie/config.json` (create the directory if it doesn't exist).

### 3. **Create session file**
Add the session header file to complete this setup:

```json
{
    "__meta__": {
	"about": "HTTPie session file",
	"help": "https://httpie.io/docs#sessions",
	"httpie": "3.2.4"
    },
    "auth": {
	"password": null,
	"type": null,
	"username": null
    },
    "cookies": [],
    "headers": [
	{
	    "name": "x-api-version",
	    "value": "2025-06"
	},
	{
	    "name": "Authorization",
	    "value": "Bearer j3oDqPBhf-ZuTGHeDf2Ru"
	},
	{
	    "name": "x-alloy-userid",
	    "value": "68f1e561ba205b5a3bf234c8"
	}
    ]
}
```

Save this as `~/.config/httpie/default_headers_session.json` 

### 4. Test it out

Run the following command to check your httpie setup:

``` bash
https https://production.runalloy.com/connectors
```

You can see all the connectors here.  We'll be using the 'zohoCRM' connector for the todo list.

For production, you will want to create this workflow dynamically, but for this example we will create the user and credential using the CLI, then plug them into the code.

## Create a user and credential

### 1. Create the user
Run the following command to create a new user.
``` bash
https https://production.runalloy.com/users \
username="<your email address>" \
fullName="<Full name>"
```

This will return a string which you will use for your userId (like '68f1e561ba205b5a3bf234c8').  If you lose this string, you can find the user with the following command:

```
https https://production.runalloy.com/users
```

Pick the user matching the email you used.  In the default_headers_session.json file (in ~/.config/httpie) change the x-alloy-userid to the user you just created.

Update the Authorization entry so that it is "Bearer <RUNALLOY_API_KEY>"

### 2. Setup your netlify environment

To use this repository, you will need to get netlify set up.

#### a. 

Click the following button to deploy the codebase to Netlify.  You need to have a Netlify account for this to work.

[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/synedra/runzoho)


### 2. Create the credential



``` bash
https https://production.runalloy.com/connectors/zohoCRM/credentials \ userId=68f1e561ba205b5a3bf234c8 \
authenticationType=oauth2 \
redirectUri=https://runzoho.netlify.app/.netlify/functions/zoho-auth \
data:='{"region":"com"}'
```

This will give you a 

## API Operations

### Tasks

#### List Tasks
```javascript
const response = await fetch('/.netlify/functions/zoho-tasks?userId=user123', {
  method: 'GET'
});
```

#### Create Task
```javascript
const response = await fetch('/.netlify/functions/zoho-tasks', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ 
    name: 'New Task',
    userId: 'user123'
  })
});
```

#### Update Task
```javascript
const response = await fetch('/.netlify/functions/zoho-tasks', {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    id: '67890',
    name: 'Updated Task',
    userId: 'user123',
    columnValues: { status: 'completed' }
  })
});
```

#### Delete Task
```javascript
const response = await fetch('/.netlify/functions/zoho-tasks?taskId=67890&userId=user123', {
  method: 'DELETE'
});
```

## File Structure

```
netlify/functions/
├── helpers/
│   └── runalloy-helper.cjs  # Core RunAlloy integration with Zoho CRM
├── zoho-auth.cjs            # Zoho authentication via RunAlloy
└── zoho-tasks.cjs           # Task operations (CRUD)

src/
├── App.js                   # Main app with simplified single list UI
├── BoardComponent.js        # Simplified task display component
├── TodoList.js              # Task CRUD UI with enhanced display
└── AppContext.js            # Global state management
```

## RunAlloy Helper

The `runalloy-helper.cjs` module provides:

### Core Function
```javascript
executeAction(connectorId, actionId, params)
```

### Zoho CRM Tasks Helpers
```javascript
zoho.listTasks(userId)        # List all tasks for user
zoho.createTask(taskData)     # Create new task with Subject, Status, Priority
zoho.updateTask(taskId, data) # Update task by ID
zoho.deleteTask(taskId)       # Delete task by ID
```

### Task Schema
Tasks use Zoho CRM field mappings:
- `Subject`: Task name/title
- `Status`: Not Started, In Progress, Completed
- `Priority`: High, Normal, Low
- `Description`: Task description
- `Due_Date`: Due date for task
- `Owner`: Task assignee

## Application Features

The application provides a simplified task management interface with:

1. ✅ Single task list view (no board selection complexity)
2. ✅ Enhanced task display with priority badges and due dates
3. ✅ Task completion toggle with checkbox
4. ✅ Rich task information including owner and descriptions
5. ✅ Full CRUD operations (Create, Read, Update, Delete)
6. ✅ Zoho CRM field mapping and status handling
7. ✅ Responsive UI with proper loading states and error handling

## Error Handling

RunAlloy errors are standardized:

```javascript
{
  statusCode: 400,
  error: "Error message",
  details: { /* additional info */ }
}
```

## Debugging

Enable detailed logging by checking:

1. **Netlify Function Logs**: See RunAlloy API requests/responses
2. **Browser Console**: See frontend errors
3. **RunAlloy Dashboard**: Monitor API usage and errors

## Troubleshooting

### "Authorization token required"
- Check `RUNALLOY_API_KEY` is set in `.env`
- Verify API key is valid in RunAlloy dashboard

### "Credential ID required"
- Ensure Zoho connector is configured in RunAlloy dashboard
- Verify credential exists and is active

### "Failed to fetch tasks"
- Check Zoho CRM connector is configured in RunAlloy dashboard
- Verify credential has necessary permissions for Tasks module
- Check RunAlloy dashboard for API errors
- Ensure Zoho CRM has Tasks module enabled

## Best Practices

1. **Error Handling**: Always handle both network and API errors
2. **Loading States**: Show loading indicators during API calls
3. **Retry Logic**: Implement retry for transient failures
4. **Caching**: Consider caching task data for better performance
5. **Rate Limits**: RunAlloy handles this, but be mindful of excessive calls

## Support

- **RunAlloy Docs**: https://docs.runalloy.com
- **Zoho CRM API**: https://www.zoho.com/crm/developer/docs/api/
- **Zoho CRM Tasks Module**: https://www.zoho.com/crm/developer/docs/api/modules-fields-api/tasks.html
- **Issues**: Check Netlify function logs and RunAlloy dashboard

## License

