import { useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, getHardwareId, saveAuth } from './api';

// Your Google Client ID from the backend .env
const GOOGLE_CLIENT_ID = '514062819723-uk69cn2672c9hdteae0kqbj4oplo9jbr.apps.googleusercontent.com';

declare global {
  interface Window {
    google?: any;
  }
}

/**
 * Renders Google One-Tap / Sign-In button inside the given container ref.
 * On success, sends the ID token to the backend and logs the user in.
 */
export function useGoogleSignIn(
  containerRef: React.RefObject<HTMLDivElement | null>,
  onError: (msg: string) => void,
) {
  const navigate = useNavigate();

  const handleCredentialResponse = useCallback(async (response: any) => {
    try {
      const { data } = await api.post('/auth/google-login', {
        google_id_token: response.credential,
        hardware_id: getHardwareId(),
      });
      // Fetch profile
      const me = await api.get('/auth/me', {
        headers: { Authorization: `Bearer ${data.access_token}` },
      });
      saveAuth(data.access_token, me.data);
      navigate(me.data.role === 'student' ? '/scan' : '/dashboard');
    } catch (err: any) {
      onError(err.response?.data?.detail || 'Google sign-in failed.');
    }
  }, [navigate, onError]);

  useEffect(() => {
    // Wait for the GSI script to load
    const timer = setInterval(() => {
      if (window.google?.accounts?.id && containerRef.current) {
        clearInterval(timer);

        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: handleCredentialResponse,
        });

        window.google.accounts.id.renderButton(containerRef.current, {
          theme: 'outline',
          size: 'large',
          width: containerRef.current.offsetWidth,
          text: 'continue_with',
          shape: 'rectangular',
          logo_alignment: 'left',
        });
      }
    }, 200);

    return () => clearInterval(timer);
  }, [containerRef, handleCredentialResponse]);
}
