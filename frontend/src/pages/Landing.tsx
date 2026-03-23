import { useNavigate } from 'react-router-dom';
import { isLoggedIn, getUser } from '../lib/api';
import { useEffect } from 'react';
import { ScanFace, ShieldCheck, MapPin, Smartphone, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import type { Variants } from 'framer-motion';

export default function Landing() {
  const navigate = useNavigate();

  useEffect(() => {
    if (isLoggedIn()) {
      const u = getUser();
      navigate(u?.role === 'student' ? '/scan' : '/dashboard');
    }
  }, [navigate]);

  const fadeUp: Variants = {
    hidden: { opacity: 0, y: 15 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } }
  };

  const staggerContainer: Variants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--bg-color)' }}>
      
      {/* Navbar - pure minimal border */}
      <nav className="navbar" style={{ borderBottom: '1px solid var(--border-color)', background: 'var(--bg-color)' }}>
        <div className="container navbar-content" style={{ maxWidth: 1000 }}>
          <div className="logo"><ScanFace size={18} /> QuickScan</div>
          <div style={{ display: 'flex', gap: 12 }}>
            <button className="btn-ghost" onClick={() => navigate('/login')}>Log in</button>
            <button className="btn-primary" onClick={() => navigate('/register')} style={{ borderRadius: 6, fontSize: 13, padding: '6px 14px' }}>
              Get Started
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section - Strict minimal typography */}
      <section style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '100px 24px', textAlign: 'center' }}>
        <motion.div 
          variants={staggerContainer} initial="hidden" animate="visible"
          style={{ maxWidth: 660, position: 'relative', zIndex: 1 }}
        >
          <motion.h1 variants={fadeUp} style={{ fontSize: 'clamp(2.5rem, 5vw, 3.5rem)', lineHeight: 1.15, marginBottom: 20, letterSpacing: '-0.03em', fontWeight: 700, color: 'var(--text-primary)' }}>
            Secure QR-based attendance<br/>for modern institutions
          </motion.h1>

          <motion.p variants={fadeUp} style={{ fontSize: '1.25rem', maxWidth: 540, margin: '0 auto 32px', lineHeight: 1.5, color: 'var(--text-secondary)', fontWeight: 400 }}>
            Cryptographically signed QR codes, GPS geofencing, and hardware device locking — 
            making proxy attendance impossible.
          </motion.p>

          <motion.div variants={fadeUp} style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button 
              className="btn-primary" 
              style={{ padding: '10px 20px', fontSize: 15, borderRadius: 6, fontWeight: 500 }} 
              onClick={() => navigate('/register')}
            >
              Create Free Account <ArrowRight size={16} style={{ marginLeft: 4 }} />
            </button>
            <button 
              className="btn-secondary" 
              style={{ padding: '10px 20px', fontSize: 15, borderRadius: 6, fontWeight: 500, borderColor: 'var(--border-color)', background: 'transparent' }} 
              onClick={() => navigate('/login')}
            >
              Sign In
            </button>
          </motion.div>
        </motion.div>
      </section>

      {/* Features Grid - Clean gray background, flat cards */}
      <section style={{ padding: '80px 24px', background: 'var(--bg-secondary)', borderTop: '1px solid var(--border-color)', borderBottom: '1px solid var(--border-color)' }}>
        <div className="container" style={{ maxWidth: 1000 }}>
          <motion.h2 
            initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.4 }}
            style={{ textAlign: 'center', fontSize: '1.5rem', marginBottom: 48, fontWeight: 600, color: 'var(--text-primary)' }}
          >
            How QuickScan Works
          </motion.h2>

          <motion.div 
            variants={staggerContainer} initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-50px" }}
            style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 24 }}
          >
            {[
              { icon: <ScanFace size={20} color="var(--text-primary)" />, title: 'Dynamic QR Codes', desc: 'HMAC-SHA256 signed QR tokens that expire in 15 seconds. Cannot be screenshotted or shared.' },
              { icon: <MapPin size={20} color="var(--text-primary)" />, title: 'GPS Geofencing', desc: 'Haversine-validated location checks ensure the student is physically inside the classroom.' },
              { icon: <Smartphone size={20} color="var(--text-primary)" />, title: 'Device Locking', desc: 'Each account is permanently bound to one device. Logging in from another device is blocked.' },
              { icon: <ShieldCheck size={20} color="var(--text-primary)" />, title: 'Audit Trail', desc: 'Every QR generation, scan attempt, and device mismatch is logged in an immutable ledger.' },
            ].map((f, i) => (
              <motion.div 
                key={i} variants={fadeUp} 
                className="notion-block" style={{ padding: 24, background: 'var(--bg-color)', border: '1px solid var(--border-color)', borderRadius: 8, boxShadow: 'rgba(15, 15, 15, 0.05) 0px 1px 2px' }}
              >
                <div style={{ padding: 8, background: 'var(--bg-secondary)', borderRadius: 6, display: 'inline-flex', marginBottom: 16 }}>
                  {f.icon}
                </div>
                <h3 style={{ fontSize: 16, marginBottom: 8, fontWeight: 600, color: 'var(--text-primary)' }}>{f.title}</h3>
                <p style={{ fontSize: 14, lineHeight: 1.5, color: 'var(--text-secondary)' }}>{f.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Footer - Minimalist */}
      <footer style={{ padding: '32px 24px', textAlign: 'center', background: 'var(--bg-color)' }}>
        <p style={{ fontSize: 13, color: 'var(--text-placeholder)', fontWeight: 500 }}>© {new Date().getFullYear()} QuickScan</p>
      </footer>
    </div>
  );
}
