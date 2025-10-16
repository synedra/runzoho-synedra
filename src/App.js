import React, { useState, useEffect } from 'react';
import './App.css';
import BoardComponent from './BoardComponent';
import BoardManagement from './BoardManagement';

function App() {
  const [boards, setBoards] = useState([]);
  const [loadingBoards, setLoadingBoards] = useState(false);
  const [error, setError] = useState(null);
  const [userEmail, setUserEmail] = useState('');
  const [emailSubmitted, setEmailSubmitted] = useState(false);
  const [checkingCredential, setCheckingCredential] = useState(false);
  const [needsAuth, setNeedsAuth] = useState(false);

  useEffect(() => {
    const storedEmail = localStorage.getItem('user_email');
    if (storedEmail) {
      setUserEmail(storedEmail);
      setEmailSubmitted(true);
      checkCredentialsAndAuth(storedEmail);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    if (!userEmail.trim() || !userEmail.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }
    
    localStorage.setItem('user_email', userEmail);
    setEmailSubmitted(true);
    setError(null);
    await checkCredentialsAndAuth(userEmail);
  };

  const checkCredentialsAndAuth = async (email) => {
    setCheckingCredential(true);
    setError(null);
    
    try {
      const response = await fetch(`/.netlify/functions/runalloy-auth?action=check-status&userId=${encodeURIComponent(email)}`);
      const data = await response.json();
      
      console.log('Credential status:', data);
      
      if (data.hasCredential) {
        setNeedsAuth(false);
        await fetchBoards(email);
      } else {
        console.log('No credential, creating OAuth URL...');
        const linkResponse = await fetch(`/.netlify/functions/runalloy-auth?action=create-link&userId=${encodeURIComponent(email)}`);
        
        if (!linkResponse.ok) {
          const errorText = await linkResponse.text();
          console.error('Link creation failed:', errorText);
          throw new Error('Failed to create authentication link');
        }
        
        const linkData = await linkResponse.json();
        console.log('Link response:', linkData);
        
        if (!linkData.linkUrl) {
          console.error('No linkUrl in response:', linkData);
          throw new Error('Invalid response from authentication service');
        }
        
        console.log('Redirecting to OAuth URL:', linkData.linkUrl);
        setNeedsAuth(true);
        window.location.href = linkData.linkUrl;
      }
    } catch (err) {
      console.error('Error:', err);
      setError('Failed to authenticate: ' + err.message);
      setCheckingCredential(false);
      setNeedsAuth(false);
    }
  };

  const fetchBoards = async (email) => {
    setLoadingBoards(true);
    setError(null);
    try {
      const response = await fetch(`/.netlify/functions/monday-boards?userId=${encodeURIComponent(email)}`, {
        method: 'GET',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch boards');
      }

      const data = await response.json();
      const transformedBoards = (data.data || []).map(board => ({
        id: board.id,
        name: board.name,
        updated_at: board.updated_at,
        items: board.items_page?.items || []
      }));
      setBoards(transformedBoards);
      setCheckingCredential(false);
    } catch (error) {
      console.error('Error fetching boards:', error);
      setError(error.message);
      setCheckingCredential(false);
    } finally {
      setLoadingBoards(false);
    }
  };

  const handleBoardChange = () => {
    fetchBoards(userEmail);
  };

  const handleLogout = () => {
    localStorage.removeItem('user_email');
    setUserEmail('');
    setEmailSubmitted(false);
    setBoards([]);
    setError(null);
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>Monday.com Todo List (via RunAlloy)</h1>

        {!emailSubmitted && (
          <div style={{
            marginBottom: '20px',
            padding: '30px',
            backgroundColor: '#f8f9fa',
            borderRadius: '8px',
            border: '1px solid #dee2e6',
            maxWidth: '500px',
            textAlign: 'center'
          }}>
            <h3 style={{ marginTop: 0, color: '#333' }}>Welcome!</h3>
            <p style={{ color: '#666', marginBottom: '20px' }}>
              Enter your email to get started
            </p>
            <form onSubmit={handleEmailSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <input
                type="email"
                value={userEmail}
                onChange={(e) => setUserEmail(e.target.value)}
                placeholder="your.email@example.com"
                required
                autoFocus
                style={{
                  padding: '12px',
                  fontSize: '16px',
                  borderRadius: '4px',
                  border: '1px solid #ced4da'
                }}
              />
              <button type="submit" style={{
                padding: '12px 24px',
                fontSize: '16px',
                backgroundColor: '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: 'bold'
              }}>
                Continue
              </button>
            </form>
            <button
              onClick={() => {
                localStorage.removeItem('user_email');
                window.location.reload();
              }}
              style={{
                marginTop: '10px',
                padding: '6px 12px',
                fontSize: '12px',
                backgroundColor: 'transparent',
                color: '#666',
                border: '1px solid #ccc',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Reset
            </button>
          </div>
        )}

        {checkingCredential && <div style={{ padding: '20px' }}><p>Setting up your account...</p></div>}
        {needsAuth && <div style={{ padding: '20px' }}><p>Redirecting to Monday.com...</p></div>}

        {error && (
          <div style={{
            marginBottom: '20px',
            padding: '15px',
            backgroundColor: '#f8d7da',
            borderRadius: '8px',
            border: '1px solid #f5c6cb',
            color: '#721c24',
            maxWidth: '600px'
          }}>
            <strong>Error:</strong> {error}
          </div>
        )}

        {emailSubmitted && !checkingCredential && !needsAuth && (
          <>
            <div style={{ marginBottom: '20px', textAlign: 'right', maxWidth: '1200px', width: '100%' }}>
              <span style={{ marginRight: '15px', color: '#666' }}>{userEmail}</span>
              <button onClick={handleLogout} style={{
                padding: '8px 16px',
                backgroundColor: '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px'
              }}>
                Logout
              </button>
            </div>

            {loadingBoards && <p>Loading boards...</p>}
            
            {!loadingBoards && !error && (
              <>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', justifyContent: 'center' }}>
                  <BoardComponent boards={boards} defaultBoardIndex={0} />
                  <BoardComponent boards={boards} defaultBoardIndex={1} />
                </div>

                <BoardManagement boards={boards} onBoardChange={handleBoardChange} />
              </>
            )}
          </>
        )}
      </header>
    </div>
  );
}

export default App;
