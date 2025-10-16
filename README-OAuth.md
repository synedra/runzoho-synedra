# Runalloy Asana-Slack OAuth Integration

This project provides OAuth 2.0 integration functions for connecting Asana and Slack accounts through Runalloy.

## Setup

1. **Create OAuth Apps:**
   - **Asana:** Create an app at https://app.asana.com/-/developer_console
   - **Slack:** Create an app at https://api.slack.com/apps

2. **Configure Environment Variables:**
   Copy `.env.example` to your Netlify environment variables:

   ```bash
   ASANA_CLIENT_ID=your_asana_client_id
   ASANA_CLIENT_SECRET=your_asana_client_secret
   ASANA_REDIRECT_URI=https://your-site.netlify.app/asana-oauth-callback

   SLACK_CLIENT_ID=your_slack_client_id
   SLACK_CLIENT_SECRET=your_slack_client_secret
   SLACK_REDIRECT_URI=https://your-site.netlify.app/slack-oauth-callback
   ```

3. **Set Redirect URIs:**
   - Asana: `https://your-site.netlify.app/asana-oauth-callback`
   - Slack: `https://your-site.netlify.app/slack-oauth-callback`

## Functions

### Asana OAuth

- **Initiation:** `/.netlify/functions/asana-oauth-init`
  - Redirects to Asana authorization page
  - Scopes: `default` (basic access)

- **Callback:** `/.netlify/functions/asana-oauth-callback`
  - Exchanges authorization code for access token
  - Returns tokens to client

### Slack OAuth

- **Initiation:** `/.netlify/functions/slack-oauth-init`
  - Redirects to Slack authorization page
  - Scopes: `channels:read, chat:write, users:read`

- **Callback:** `/.netlify/functions/slack-oauth-callback`
  - Exchanges authorization code for access token
  - Returns tokens to client

## Usage

### Client-Side Integration

```javascript
// Initiate Asana OAuth
window.location.href = '/.netlify/functions/asana-oauth-init';

// Handle callback (on your callback page)
fetch('/.netlify/functions/asana-oauth-callback?' + window.location.search)
  .then(response => response.json())
  .then(data => {
    if (data.success) {
      // Store tokens securely
      localStorage.setItem('asana_token', data.access_token);
      // Redirect to main app
    }
  });
```

## Security Notes

- Tokens are returned to the client for storage
- Implement secure token storage (e.g., httpOnly cookies, secure localStorage)
- Handle token refresh as needed
- Validate all inputs and handle errors appropriately

## Error Handling

All functions include comprehensive error handling for:
- Missing environment variables
- Invalid authorization codes
- Network errors during token exchange
- OAuth provider errors

## CORS

All functions include CORS headers to allow client-side requests.