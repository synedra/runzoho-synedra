# RunAlloy Integration Guide

This application uses RunAlloy to integrate with Monday.com, providing a unified API layer for all Monday.com operations.

## Overview

Instead of calling Monday.com's API directly, this application routes all requests through RunAlloy's connector system. This provides several benefits:

- **Centralized Authentication**: RunAlloy manages OAuth credentials and tokens
- **Unified API**: Consistent interface across different connectors
- **Better Error Handling**: Standardized error responses
- **Rate Limiting**: Built-in rate limit management
- **Monitoring**: Track API usage through RunAlloy dashboard

## Architecture

```
Frontend (React)
    ↓
Netlify Functions (monday-boards.js, monday-items.js)
    ↓
RunAlloy Helper (runalloy-helper.js)
    ↓
RunAlloy API
    ↓
Monday.com API
```

## Setup

### 1. Environment Variables

Add these variables to your `.env` file:

```bash
# RunAlloy API Configuration
RUNALLOY_API_KEY=your_api_key_here
RUNALLOY_CREDENTIAL_ID=your_credential_id_here
RUNALLOY_API_URL=https://production.runalloy.com
```

### 2. Get Your Credentials

1. **API Key**: Get from RunAlloy dashboard → Settings → API Keys
2. **Credential ID**: 
   - Go to RunAlloy dashboard → Credentials
   - Create or select a Monday.com credential
   - Copy the credential ID

### 3. Deploy

The application will automatically use RunAlloy for all Monday.com operations. No OAuth flow is needed in the frontend since RunAlloy manages authentication.

## API Operations

### Boards

#### List Boards
```javascript
const response = await fetch('/.netlify/functions/monday-boards', {
  method: 'GET'
});
```

#### Create Board
```javascript
const response = await fetch('/.netlify/functions/monday-boards', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ name: 'New Board' })
});
```

#### Update Board
```javascript
const response = await fetch('/.netlify/functions/monday-boards', {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ id: '12345', name: 'Updated Name' })
});
```

#### Delete Board
```javascript
const response = await fetch('/.netlify/functions/monday-boards?boardId=12345', {
  method: 'DELETE'
});
```

### Items

#### List Items
```javascript
const response = await fetch('/.netlify/functions/monday-items?boardId=12345', {
  method: 'GET'
});
```

#### Create Item
```javascript
const response = await fetch('/.netlify/functions/monday-items?boardId=12345', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ name: 'New Task' })
});
```

#### Update Item
```javascript
const response = await fetch('/.netlify/functions/monday-items', {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ 
    id: '67890',
    name: 'Updated Task',
    boardId: '12345',
    columnValues: { status: 'Done' }
  })
});
```

#### Delete Item
```javascript
const response = await fetch('/.netlify/functions/monday-items?itemId=67890', {
  method: 'DELETE'
});
```

## File Structure

```
netlify/functions/
├── runalloy-helper.js       # Core RunAlloy integration
├── monday-boards.js          # Board operations
└── monday-items.js           # Item operations

src/
├── App.js                    # Main app (no auth needed)
├── BoardManagement.js        # Board CRUD UI
├── BoardComponent.js         # Board display
└── TodoList.js              # Item CRUD UI
```

## RunAlloy Helper

The `runalloy-helper.js` module provides:

### Core Function
```javascript
executeAction(connectorId, actionId, params)
```

### Monday.com Helpers
```javascript
monday.listBoards()
monday.createBoard(name)
monday.updateBoard(boardId, name)
monday.deleteBoard(boardId)
monday.listItems(boardId)
monday.createItem(boardId, itemName)
monday.updateItem(itemId, updates)
monday.deleteItem(itemId)
```

## Customizing Actions

To add new Monday.com actions:

1. **Add to runalloy-helper.js**:
```javascript
async getBoard(boardId) {
  return executeAction('monday', 'getBoard', {
    queryParameters: { board_id: boardId }
  });
}
```

2. **Use in your function**:
```javascript
const { monday } = require('./runalloy-helper');
const board = await monday.getBoard('12345');
```

## Error Handling

RunAlloy errors are standardized:

```javascript
{
  statusCode: 400,
  error: "Error message",
  details: { /* additional info */ }
}
```

Handle errors in your frontend:

```javascript
try {
  const response = await fetch('/.netlify/functions/monday-boards');
  if (!response.ok) {
    const error = await response.json();
    console.error('Error:', error.error);
  }
} catch (err) {
  console.error('Network error:', err);
}
```

## Debugging

Enable detailed logging by checking:

1. **Netlify Function Logs**: See RunAlloy API requests/responses
2. **Browser Console**: See frontend errors
3. **RunAlloy Dashboard**: Monitor API usage and errors

## Migration from Direct API

If migrating from direct Monday.com API calls:

1. ✅ Remove all `localStorage.getItem('monday_token')` calls
2. ✅ Remove Authorization headers from fetch requests
3. ✅ Remove OAuth flow components
4. ✅ Update `.env` with RunAlloy credentials
5. ✅ Test all CRUD operations

## Troubleshooting

### "Authorization token required"
- Check `RUNALLOY_API_KEY` is set in `.env`
- Verify API key is valid in RunAlloy dashboard

### "Credential ID required"
- Check `RUNALLOY_CREDENTIAL_ID` is set in `.env`
- Verify credential exists in RunAlloy dashboard

### "Failed to fetch boards/items"
- Check Monday.com credential is connected in RunAlloy
- Verify credential has necessary permissions
- Check RunAlloy dashboard for API errors

### Response structure issues
- RunAlloy wraps responses in `responseData`
- Check `runalloy-helper.js` for correct path extraction
- Example: `response.responseData?.data?.boards`

## Best Practices

1. **Error Handling**: Always handle both network and API errors
2. **Loading States**: Show loading indicators during API calls
3. **Retry Logic**: Implement retry for transient failures
4. **Caching**: Consider caching board/item lists
5. **Rate Limits**: RunAlloy handles this, but be mindful of excessive calls

## Support

- **RunAlloy Docs**: https://docs.runalloy.com
- **Monday.com API**: https://developer.monday.com
- **Issues**: Check Netlify function logs and RunAlloy dashboard

## License

Same as main project