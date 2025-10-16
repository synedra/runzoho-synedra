# Deployment Guide for RunAlloy Integration

## Quick Deploy to Netlify

### 1. Add Files to Git

```bash
git add netlify/functions/runalloy-helper.js
git add netlify/functions/runalloy-auth.js
git add netlify/functions/monday-boards.js
git add netlify/functions/monday-items.js
git add src/App.js
git add src/TodoList.js
git add src/BoardManagement.js
git add README-RunAlloy.md
git add netlify.toml
```

### 2. Commit Changes

```bash
git commit -m "Integrate RunAlloy for Monday.com API calls with automatic credential creation"
```

### 3. Push to Deploy

```bash
git push origin main
```

Netlify will automatically deploy your changes.

### 4. Set Environment Variables in Netlify

Go to your Netlify dashboard → Site settings → Environment variables and add:

```
RUNALLOY_API_KEY=68ed7cddba205b5a3b6ddfec
RUNALLOY_API_URL=https://production.runalloy.com
RUNALLOY_USER_ID=default_user
```

**Note:** You can remove these old variables if they exist:
- `RUNALLOY_CREDENTIAL_ID` (no longer needed - now dynamic per user)

### 5. Trigger Redeploy

After adding environment variables, trigger a redeploy:
- Netlify dashboard → Deploys → Trigger deploy → Deploy site

## Testing After Deployment

1. Visit your production URL
2. Enter your email address
3. If no credential exists, you'll be redirected to Monday.com auth
4. After auth, return to the app
5. Your boards should load automatically!

## Troubleshooting

### Functions not found (404)
- Make sure all files are committed and pushed
- Check Netlify build logs for function deployment
- Verify `netlify.toml` is configured correctly

### 500 errors from runalloy-auth
- Check Netlify function logs
- Verify environment variables are set
- Make sure RUNALLOY_API_KEY is correct

### Email form not showing
- Clear localStorage: `localStorage.clear()`
- Refresh the page
- Check browser console for errors

## Local Development

For local testing with Netlify Dev:

```bash
netlify dev
```

This will run both the React app and Netlify functions locally.

**Note:** Make sure your `.env` file has all required variables.