import { useEffect, useCallback } from 'react';
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
    let attempts = 0;
    const maxAttempts = 50; // 10 seconds max

    const timer = setInterval(() => {
      attempts++;

      // After 10 seconds, show a helpful error
      if (attempts >= maxAttempts) {
        clearInterval(timer);
        console.warn('[QuickScan] Google Sign-In failed to load after 10s');
        // Show a manual fallback message
        if (containerRef.current) {
          containerRef.current.innerHTML = `
            <p style="font-size:12px;color:#999;text-align:center;padding:8px;">
              Google Sign-In unavailable.<br/>Use email/password below.
            </p>`;
        }
        return;
      }

      if (window.google?.accounts?.id && containerRef.current) {
        clearInterval(timer);

        try {
          window.google.accounts.id.initialize({
            client_id: GOOGLE_CLIENT_ID,
            callback: handleCredentialResponse,
          });

          window.google.accounts.id.renderButton(containerRef.current, {
            theme: 'outline',
            size: 'large',
            width: containerRef.current.offsetWidth || 320,
            text: 'continue_with',
            shape: 'rectangular',
            logo_alignment: 'left',
          });
        } catch (err) {
          console.error('[QuickScan] Google Sign-In render error:', err);
          if (containerRef.current) {
            containerRef.current.innerHTML = `
              <p style="font-size:12px;color:#e03e3e;text-align:center;padding:8px;">
                Google Sign-In error. Use email/password below.
              </p>`;
          }
        }
      }
    }, 200);

    return () => clearInterval(timer);
  }, [containerRef, handleCredentialResponse]);
}
