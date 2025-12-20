import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

// REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH

const AuthCallback = () => {
  const navigate = useNavigate();
  const { exchangeSession } = useAuth();
  const hasProcessed = useRef(false);

  useEffect(() => {
    // Use ref to prevent double processing in StrictMode
    if (hasProcessed.current) return;
    hasProcessed.current = true;

    const processAuth = async () => {
      try {
        // Get session_id from URL fragment
        const hash = window.location.hash;
        const params = new URLSearchParams(hash.replace('#', ''));
        const sessionId = params.get('session_id');

        if (!sessionId) {
          console.error('No session_id in URL');
          navigate('/');
          return;
        }

        // Exchange session_id for session_token
        await exchangeSession(sessionId);
        
        // Clear the hash and navigate to dashboard
        window.history.replaceState(null, '', window.location.pathname);
        navigate('/dashboard', { replace: true });
      } catch (error) {
        console.error('Auth callback error:', error);
        navigate('/');
      }
    };

    processAuth();
  }, [navigate, exchangeSession]);

  return (
    <div className="min-h-screen bg-void flex items-center justify-center">
      <div className="text-center">
        <div className="spinner mx-auto mb-4"></div>
        <p className="text-zinc-400 font-mono text-sm uppercase tracking-wider">Authenticating...</p>
      </div>
    </div>
  );
};

export default AuthCallback;
