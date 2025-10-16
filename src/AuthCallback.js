import React, { useEffect } from 'react';

function AuthCallback() {
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const provider = urlParams.get('provider');
    const accessToken = urlParams.get('access_token');
    const refreshToken = urlParams.get('refresh_token');
    const expiresIn = urlParams.get('expires_in');
    const tokenType = urlParams.get('token_type');

    if (provider && accessToken) {
      // Store tokens in localStorage
      localStorage.setItem(`${provider}_token`, accessToken);
      if (refreshToken && refreshToken !== 'undefined') localStorage.setItem(`${provider}_refresh_token`, refreshToken);
      if (expiresIn && expiresIn !== 'undefined') localStorage.setItem(`${provider}_expires_in`, expiresIn);
      if (tokenType) localStorage.setItem(`${provider}_token_type`, tokenType);

      // Store additional provider-specific data
      if (provider === 'slack') {
        const scope = urlParams.get('scope');
        const team = urlParams.get('team');
        const authedUser = urlParams.get('authed_user');
        if (scope) localStorage.setItem('slack_scope', scope);
        if (team) localStorage.setItem('slack_team', team);
        if (authedUser) localStorage.setItem('slack_authed_user', authedUser);
      }

      if (provider === 'monday') {
        console.log('Monday auth callback - storing tokens:', { accessToken, refreshToken, expiresIn, tokenType });
      }

      // Redirect to main app
      window.location.href = '/';
    } else {
      // Handle error
      console.error('Authentication failed');
      window.location.href = '/';
    }
  }, []);

  return (
    <div style={{ textAlign: 'center', padding: '50px' }}>
      <h2>Authenticating...</h2>
      <p>Please wait while we complete the authentication process.</p>
    </div>
  );
}

export default AuthCallback;