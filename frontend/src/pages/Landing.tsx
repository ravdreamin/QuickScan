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
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } }
  };

  const staggerContainer: Variants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.15 } }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>
      
      {/* Subtle modern glowing background in the top center */}
      <div style={{
        position: 'absolute', top: -150, left: '50%', transform: 'translateX(-50%)',
        width: 800, height: 400, background: 'radial-gradient(ellipse at center, rgba(15, 123, 108, 0.15), transparent 70%)',
        zIndex: -1, pointerEvents: 'none'
      }} />

      {/* Navbar - animate sliding down */}
      <motion.nav 
        initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
        className="navbar" style={{ background: 'transparent', borderBottom: 'none' }}
      >
        <div className="container navbar-content">
          <div className="logo"><ScanFace size={20} /> QuickScan</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn-ghost" onClick={() => navigate('/login')}>Log in</button>
            <motion.button 
              whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              className="btn-primary" onClick={() => navigate('/register')}
            >
              Get Started <ArrowRight size={16} />
            </motion.button>
          </div>
        </div>
      </motion.nav>

      {/* Hero Section */}
      <section style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '120px 24px 80px', textAlign: 'center', position: 'relative' }}>
        <motion.div 
          variants={staggerContainer} initial="hidden" animate="visible"
          style={{ maxWidth: 720, position: 'relative', zIndex: 1 }}
        >
          <motion.h1 variants={fadeUp} style={{ fontSize: 'clamp(2.5rem, 6vw, 4.5rem)', lineHeight: 1.1, marginBottom: 24, letterSpacing: '-0.04em', fontWeight: 800 }}>
            Secure QR-based attendance <br/> for modern institutions
          </motion.h1>

          <motion.p variants={fadeUp} className="text-secondary" style={{ fontSize: '1.25rem', maxWidth: 560, margin: '0 auto 40px', lineHeight: 1.5 }}>
            Cryptographically signed QR codes, GPS geofencing, and hardware device locking — 
            making proxy attendance impossible.
          </motion.p>

          <motion.div variants={fadeUp} style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
            <motion.button 
              whileHover={{ scale: 1.05, boxShadow: '0 10px 25px rgba(15, 123, 108, 0.3)' }} whileTap={{ scale: 0.95 }}
              className="btn-primary" style={{ padding: '14px 32px', fontSize: 16, borderRadius: 12 }} 
              onClick={() => navigate('/register')}
            >
              Create Free Account <ArrowRight size={18} style={{ marginLeft: 6, verticalAlign: -3 }} />
            </motion.button>
            <motion.button 
              whileHover={{ scale: 1.05, backgroundColor: 'var(--bg-color)', borderColor: '#d1d5db' }} whileTap={{ scale: 0.95 }}
              className="btn-secondary" style={{ padding: '14px 32px', fontSize: 16, borderRadius: 12, border: '1px solid var(--border-color)' }} 
              onClick={() => navigate('/login')}
            >
              Sign In
            </motion.button>
          </motion.div>
        </motion.div>
      </section>

      {/* Features Grid */}
      <section style={{ padding: '80px 24px 100px', background: 'var(--bg-secondary)', borderTop: '1px solid var(--border-color)' }}>
        <div className="container" style={{ maxWidth: 1000 }}>
          <motion.h2 
            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }}
            style={{ textAlign: 'center', fontSize: '2rem', marginBottom: 56, letterSpacing: '-0.02em', fontWeight: 700 }}
          >
            How QuickScan Works
          </motion.h2>

          <motion.div 
            variants={staggerContainer} initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }}
            style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 32 }}
          >
            {[
              { icon: <ScanFace size={24} color="var(--accent-primary)" />, title: 'Dynamic QR Codes', desc: 'HMAC-SHA256 signed QR tokens that expire in 15 seconds. Cannot be screenshotted or shared.' },
              { icon: <MapPin size={24} color="#d29922" />, title: 'GPS Geofencing', desc: 'Haversine-validated location checks ensure the student is physically inside the classroom.' },
              { icon: <Smartphone size={24} color="#3b82f6" />, title: 'Device Locking', desc: 'Each account is permanently bound to one device. Logging in from another device is blocked.' },
              { icon: <ShieldCheck size={24} color="var(--success)" />, title: 'Audit Trail', desc: 'Every QR generation, scan attempt, and device mismatch is logged in an immutable ledger.' },
            ].map((f, i) => (
              <motion.div 
                key={i} variants={fadeUp} whileHover={{ y: -8 }} transition={{ duration: 0.3 }}
                className="notion-block has-border" style={{ padding: 32, background: 'var(--bg-color)', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}
              >
                <div style={{ padding: 12, background: 'var(--bg-secondary)', borderRadius: 12, border: '1px solid var(--border-color)', display: 'inline-flex', marginBottom: 20 }}>
                  {f.icon}
                </div>
                <h3 style={{ fontSize: 17, marginBottom: 12, fontWeight: 600 }}>{f.title}</h3>
                <p className="text-secondary" style={{ fontSize: 14, lineHeight: 1.6 }}>{f.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ padding: '32px 24px', textAlign: 'center', borderTop: '1px solid var(--border-color)', background: 'var(--bg-color)' }}>
        <p className="text-secondary" style={{ fontSize: 14 }}>© {new Date().getFullYear()} QuickScan — Built for secure attendance.</p>
      </footer>
    </div>
  );
}
