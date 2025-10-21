import React, { useEffect } from 'react';
import './App.css';
import BoardComponent from './BoardComponent.js';
import { useAppContext } from './AppContext.js';

function App() {
  const {
    setTasks,
    loadingBoards,
    setLoadingBoards,
    error,
    setError,
    userEmail,
    setUserEmail,
    setUserId,
    checkingCredential,
    setCheckingCredential,
    credentialId,
    setCredentialId,
    needsAuth,
    setNeedsAuth,
    emailSubmitted,
    setEmailSubmitted,
  } = useAppContext();

  useEffect(() => {
    const storedEmail = userEmail ? userEmail : "synedra@gmail.com";
    const storedUserId = localStorage.getItem('user_id');
    const urlParams = new URLSearchParams(window.location.search);
    const authSuccess = urlParams.get('auth') === 'success';

    if (storedEmail) {
      setUserEmail(storedEmail);
      setUserId(storedUserId || '');
      setEmailSubmitted(true);

      // If we just came back from auth success, skip the credential check
      if (!authSuccess) {
        console.log('Checking credentials for stored email:', storedEmail);
        checkCredentialsAndAuth(storedEmail);
      } else {
        // Clear the auth param from URL
        window.history.replaceState({}, document.title, window.location.pathname);
        // User is authenticated, fetch tasks directly
        console.log('Auth success, fetching tasks for:', storedEmail);
        fetchTasks(storedEmail);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    if (!userEmail.trim() || !userEmail.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }
    
    setUserEmail (userEmail);
    setEmailSubmitted(true);
    setError(null);
    await checkCredentialsAndAuth(userEmail);
  };


  const checkCredentialsAndAuth = async (email) => {
    setCheckingCredential(true);
    setError(null);

    setUserEmail(email);
    setNeedsAuth(false);
    await fetchTasks(email);
  };

  const fetchTasks = async (email) => {
    setLoadingBoards(true);
    setError(null);
    
    try {
      const response = await fetch(`/.netlify/functions/zoho-tasks?userId=68f1e561ba205b5a3bf234c8`)
      console.log("Response: " + response)

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch tasks');
      }

      const data = await response.json();
      console.log('Tasks data:', data);
      setTasks(data.data || []);
      setCheckingCredential(false);
    } catch (error) {
      console.error('Error fetching tasks:', error);
      setError(error.message);
      setCheckingCredential(false);
    } finally {
      setLoadingBoards(false);
    }
  };



  const handleLogout = () => {
    setUserEmail('');
    setUserId('');
    setEmailSubmitted(false);
    setError(null);
  };

  return (
    <div className="App">
      {emailSubmitted && !checkingCredential && !needsAuth && (
        <div style={{ marginBottom: '20px', textAlign: 'right', maxWidth: '1200px', width: '100%', padding: '10px 20px' }}>
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
      )}
      
      <header className="App-header">
        <h1>Zoho Tasks Todo List (via RunAlloy)</h1>

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
        {needsAuth && <div style={{ padding: '20px' }}><p>Redirecting to Zoho...</p></div>}

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
            {loadingBoards && <p>Loading tasks...</p>}
            
            {!loadingBoards && !error && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', justifyContent: 'center' }}>
                <BoardComponent />
              </div>
            )}
          </>
        )}
      </header>
    </div>
  );
}

export default App;
