import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ScanFace, AlertCircle } from 'lucide-react';
import { api, getHardwareId, saveAuth, isLoggedIn } from '../lib/api';

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isLoggedIn()) {
      navigate('/dashboard');
    }
  }, [navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      const { data } = await api.post('/auth/login', {
        email, password, hardware_id: getHardwareId(),
      });
      const me = await api.get('/auth/me', {
        headers: { Authorization: `Bearer ${data.access_token}` },
      });
      saveAuth(data.access_token, me.data);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Login failed.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <nav className="navbar">
        <div className="container navbar-content">
          <Link to="/" className="logo" style={{ textDecoration: 'none' }}><ScanFace size={20} /> QuickScan</Link>
          <Link to="/register" className="btn-ghost" style={{ textDecoration: 'none' }}>Create account</Link>
        </div>
      </nav>
      <div className="auth-wrapper">
        <div className="auth-card animate-fade-in">
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <div className="flex-center" style={{ width: 48, height: 48, borderRadius: 8, background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', margin: '0 auto 16px' }}>
              <ScanFace size={24} />
            </div>
            <h1 style={{ fontSize: '1.5rem', marginBottom: 4 }}>Log in</h1>
            <p className="text-secondary" style={{ fontSize: 14 }}>Welcome back to QuickScan</p>
          </div>

          {error && <div className="alert alert-error animate-fade-in"><AlertCircle size={16} />{error}</div>}

          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label>Email</label>
              <input type="email" className="input-base" placeholder="you@institution.edu" value={email} onChange={e => setEmail(e.target.value)} required />
            </div>
            <div className="form-group">
              <label>Password</label>
              <input type="password" className="input-base" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required />
            </div>
            <button type="submit" className="btn-primary" style={{ width: '100%', marginTop: 8, padding: '10px 16px' }} disabled={isLoading}>
              {isLoading ? 'Signing in...' : 'Continue'}
            </button>
          </form>

          <div style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid var(--border-color)', textAlign: 'center' }}>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
              Don't have an account? <Link to="/register" style={{ color: 'var(--accent-primary)', textDecoration: 'none', fontWeight: 500 }}>Sign up</Link>
            </p>
          </div>

          <div style={{ marginTop: 12, textAlign: 'center' }}>
            <p style={{ fontSize: 11, color: 'var(--text-placeholder)', fontFamily: 'monospace' }}>
              Device: {getHardwareId().slice(0, 16)}…
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
