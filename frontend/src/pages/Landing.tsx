import { useNavigate } from 'react-router-dom';
import { isLoggedIn, getUser } from '../lib/api';
import { useEffect } from 'react';
import { ScanFace, ShieldCheck, MapPin, Smartphone, ArrowRight, Zap } from 'lucide-react';

export default function Landing() {
  const navigate = useNavigate();

  useEffect(() => {
    if (isLoggedIn()) {
      const u = getUser();
      navigate(u?.role === 'student' ? '/scan' : '/dashboard');
    }
  }, [navigate]);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Navbar */}
      <nav className="navbar">
        <div className="container navbar-content">
          <div className="logo"><ScanFace size={20} /> QuickScan</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn-ghost" onClick={() => navigate('/login')}>Log in</button>
            <button className="btn-primary" onClick={() => navigate('/register')}>
              Get Started <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 24px', textAlign: 'center' }}>
        <div style={{ maxWidth: 680 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 14px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 99, fontSize: 13, fontWeight: 500, marginBottom: 24 }}>
            <Zap size={14} /> Enterprise Anti-Proxy Attendance
          </div>
          <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)', lineHeight: 1.15, marginBottom: 24, letterSpacing: '-0.03em' }}>
            Secure QR-based attendance for modern institutions
          </h1>
          <p className="text-secondary" style={{ fontSize: '1.125rem', maxWidth: 520, margin: '0 auto 40px', lineHeight: 1.6 }}>
            Cryptographically signed QR codes, GPS geofencing, and hardware device locking — 
            making proxy attendance impossible.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button className="btn-primary" style={{ padding: '12px 28px', fontSize: 15 }} onClick={() => navigate('/register')}>
              Create Free Account <ArrowRight size={16} />
            </button>
            <button className="btn-secondary" style={{ padding: '12px 28px', fontSize: 15 }} onClick={() => navigate('/login')}>
              Sign In
            </button>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section style={{ padding: '60px 24px 80px', background: 'var(--bg-secondary)' }}>
        <div className="container">
          <h2 style={{ textAlign: 'center', fontSize: '1.75rem', marginBottom: 48 }}>How QuickScan Works</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 24 }}>
            {[
              { icon: <ScanFace size={24} />, title: 'Dynamic QR Codes', desc: 'HMAC-SHA256 signed QR tokens that expire in 15 seconds. Cannot be screenshotted or shared.' },
              { icon: <MapPin size={24} />, title: 'GPS Geofencing', desc: 'Haversine-validated location checks ensure the student is physically inside the classroom.' },
              { icon: <Smartphone size={24} />, title: 'Device Locking', desc: 'Each account is permanently bound to one device. Logging in from another device is blocked.' },
              { icon: <ShieldCheck size={24} />, title: 'Audit Trail', desc: 'Every QR generation, scan attempt, and device mismatch is logged in an immutable ledger.' },
            ].map((f, i) => (
              <div key={i} className="notion-block has-border" style={{ padding: 24 }}>
                <div style={{ padding: 8, background: 'var(--bg-color)', borderRadius: 8, border: '1px solid var(--border-color)', display: 'inline-flex', marginBottom: 16 }}>
                  {f.icon}
                </div>
                <h3 style={{ fontSize: 16, marginBottom: 8 }}>{f.title}</h3>
                <p className="text-secondary" style={{ fontSize: 14 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ padding: '24px', textAlign: 'center', borderTop: '1px solid var(--border-color)' }}>
        <p className="text-secondary" style={{ fontSize: 13 }}>© 2026 QuickScan — Built for secure attendance.</p>
      </footer>
    </div>
  );
}
