import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ScanFace, User, AlertCircle, UserPlus } from 'lucide-react';
import { api, getHardwareId, saveAuth, isLoggedIn, getUser } from '../lib/api';

export default function Register() {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'student' | 'teacher'>('student');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isLoggedIn()) {
      const u = getUser();
      navigate(u?.role === 'student' ? '/scan' : '/dashboard');
    }
  }, [navigate]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      const { data } = await api.post('/auth/register', {
        full_name: fullName, email, password, role, hardware_id: getHardwareId(),
      });
      const me = await api.get('/auth/me', {
        headers: { Authorization: `Bearer ${data.access_token}` },
      });
      saveAuth(data.access_token, me.data);
      navigate(me.data.role === 'student' ? '/scan' : '/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Registration failed.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <nav className="navbar">
        <div className="container navbar-content">
          <Link to="/" className="logo" style={{ textDecoration: 'none' }}><ScanFace size={20} /> QuickScan</Link>
          <Link to="/login" className="btn-ghost" style={{ textDecoration: 'none' }}>Log in</Link>
        </div>
      </nav>
      <div className="auth-wrapper">
        <div className="auth-card animate-fade-in">
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <div className="flex-center" style={{ width: 48, height: 48, borderRadius: 8, background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', margin: '0 auto 16px' }}>
              <UserPlus size={24} />
            </div>
            <h1 style={{ fontSize: '1.5rem', marginBottom: 4 }}>Create account</h1>
            <p className="text-secondary" style={{ fontSize: 14 }}>Start using QuickScan today</p>
          </div>

          {error && <div className="alert alert-error animate-fade-in"><AlertCircle size={16} />{error}</div>}

          {/* Role toggle */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 24, padding: 4, background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)' }}>
            <button type="button" className="btn-ghost" style={{ width: '50%', background: role === 'student' ? 'var(--bg-color)' : 'transparent', boxShadow: role === 'student' ? 'var(--shadow-sm)' : 'none' }} onClick={() => setRole('student')}>
              <User size={16} /> Student
            </button>
            <button type="button" className="btn-ghost" style={{ width: '50%', background: role === 'teacher' ? 'var(--bg-color)' : 'transparent', boxShadow: role === 'teacher' ? 'var(--shadow-sm)' : 'none' }} onClick={() => setRole('teacher')}>
              <ScanFace size={16} /> Teacher
            </button>
          </div>

          <form onSubmit={handleRegister}>
            <div className="form-group">
              <label>Full Name</label>
              <input type="text" className="input-base" placeholder="John Doe" value={fullName} onChange={e => setFullName(e.target.value)} required />
            </div>
            <div className="form-group">
              <label>Email</label>
              <input type="email" className="input-base" placeholder="you@institution.edu" value={email} onChange={e => setEmail(e.target.value)} required />
            </div>
            <div className="form-group">
              <label>Password</label>
              <input type="password" className="input-base" placeholder="Min 6 characters" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} />
            </div>
            <button type="submit" className="btn-primary" style={{ width: '100%', marginTop: 8, padding: '10px 16px' }} disabled={isLoading}>
              {isLoading ? 'Creating account...' : 'Sign Up'}
            </button>
          </form>

          <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border-color)', textAlign: 'center' }}>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
              Already have an account? <Link to="/login" style={{ color: 'var(--accent-primary)', textDecoration: 'none', fontWeight: 500 }}>Log in</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
