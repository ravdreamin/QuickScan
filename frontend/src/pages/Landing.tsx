import { useNavigate } from 'react-router-dom';
import { isLoggedIn, getUser } from '../lib/api';
import { useEffect } from 'react';
import { ScanFace, ShieldCheck, MapPin, ArrowRight, CheckCircle2, QrCode, Lock } from 'lucide-react';
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
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } }
  };

  const staggerContainer: Variants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.15 } }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--bg-color)', color: 'var(--text-primary)', overflowX: 'hidden' }}>
      
      {/* Notion-style minimal Navbar */}
      <nav style={{ position: 'sticky', top: 0, zIndex: 50, background: 'rgba(255, 255, 255, 0.8)', backdropFilter: 'blur(12px)', borderBottom: '1px solid var(--border-color)' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '12px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600, fontSize: 16 }}>
            <ScanFace size={20} /> QuickScan
          </div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <button className="btn-ghost" onClick={() => navigate('/login')} style={{ fontWeight: 500, fontSize: 13, padding: '6px 12px' }}>Log in</button>
            <button className="btn-primary" onClick={() => navigate('/register')} style={{ borderRadius: 6, fontSize: 13, padding: '6px 14px' }}>
              Sign up free
            </button>
          </div>
        </div>
      </nav>

      {/* Main Hero */}
      <section style={{ paddingTop: '100px', paddingBottom: '60px', paddingLeft: 24, paddingRight: 24, textAlign: 'center' }}>
        <motion.div variants={staggerContainer} initial="hidden" animate="visible" style={{ maxWidth: 840, margin: '0 auto' }}>
          <motion.h1 variants={fadeUp} style={{ fontSize: 'clamp(3rem, 7vw, 4.5rem)', lineHeight: 1.1, marginBottom: 24, letterSpacing: '-0.04em', fontWeight: 700 }}>
            Secure attendance.<br />Impossible to fake.
          </motion.h1>
          <motion.p variants={fadeUp} style={{ fontSize: '1.25rem', maxWidth: 640, margin: '0 auto 32px', color: 'var(--text-secondary)', lineHeight: 1.5, fontWeight: 400 }}>
            QuickScan uses rolling QR codes, strict GPS geofencing, and 1-to-1 device locking to ensure students are actually in the room.
          </motion.p>
          <motion.div variants={fadeUp} style={{ display: 'flex', gap: 12, justifyContent: 'center', marginBottom: 60 }}>
            <button className="btn-primary" onClick={() => navigate('/register')} style={{ padding: '12px 24px', fontSize: 15, borderRadius: 6, fontWeight: 500 }}>
              Get QuickScan free <ArrowRight size={16} style={{ marginLeft: 6, verticalAlign: -3 }} />
            </button>
          </motion.div>

          {/* Abstract App Mockup instead of an image */}
          <motion.div variants={fadeUp} style={{ 
            background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 12, 
            height: 400, display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 4px 24px rgba(0,0,0,0.04)',
            maxWidth: 900, margin: '0 auto'
          }}>
            <div style={{ height: 40, borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', padding: '0 16px', gap: 6, background: '#fff' }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#ff5f56' }} />
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#ffbd2e' }} />
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#27c93f' }} />
            </div>
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
              <div style={{ padding: 24, background: '#fff', borderRadius: 16, border: '1px solid var(--border-color)', boxShadow: 'rgba(15, 15, 15, 0.05) 0px 2px 8px' }}>
                <QrCode size={120} strokeWidth={1} />
              </div>
              <div style={{ fontSize: 14, color: 'var(--text-secondary)', fontFamily: 'monospace' }}>Expires in: 14s</div>
            </div>
          </motion.div>
        </motion.div>
      </section>

      {/* Feature Section 1: Left Text, Right Visual */}
      <section style={{ padding: '100px 24px' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto', display: 'flex', gap: 60, flexWrap: 'wrap', alignItems: 'center' }}>
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={fadeUp} style={{ flex: '1 1 400px' }}>
            <div style={{ display: 'inline-flex', padding: '6px 12px', background: 'var(--bg-secondary)', borderRadius: 6, marginBottom: 16, fontSize: 13, fontWeight: 500 }}>
              <Lock size={14} style={{ marginRight: 6, verticalAlign: -2 }} /> 1-Device Policy
            </div>
            <h2 style={{ fontSize: '2.5rem', lineHeight: 1.2, fontWeight: 700, marginBottom: 16, letterSpacing: '-0.03em' }}>
              Bound to their phone.
            </h2>
            <p style={{ fontSize: '1.1rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 24 }}>
              The moment a student registers, their account is cryptographically locked to their hardware footprint. They cannot log in on a friend's phone to fake a scan.
            </p>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
              {['Browser fingerprinting', 'Prevents multi-device login', 'Blocks proxy attendance apps'].map((item, i) => (
                <li key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 15, color: 'var(--text-primary)' }}>
                  <CheckCircle2 size={18} color="var(--success)" /> {item}
                </li>
              ))}
            </ul>
          </motion.div>
          <motion.div initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ duration: 0.5 }} style={{ flex: '1 1 400px' }}>
            <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 12, padding: 32, aspectRatio: '4/3', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div className="status-pill error" style={{ padding: '12px 24px', fontSize: 15 }}>
                <ShieldCheck size={18} /> Hardware mismatch detected
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Feature Section 2: Right Text, Left Visual (Grid) */}
      <section style={{ padding: '80px 24px 120px', background: 'var(--bg-secondary)', borderTop: '1px solid var(--border-color)' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-50px" }} variants={fadeUp} style={{ textAlign: 'center', marginBottom: 60 }}>
            <h2 style={{ fontSize: '2.5rem', fontWeight: 700, letterSpacing: '-0.03em', marginBottom: 16 }}>Everything you need.</h2>
            <p style={{ fontSize: '1.1rem', color: 'var(--text-secondary)', maxWidth: 500, margin: '0 auto' }}>A complete suite of tools built specifically for strict classroom compliance.</p>
          </motion.div>

          <motion.div variants={staggerContainer} initial="hidden" whileInView="visible" viewport={{ once: true }} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24 }}>
            {[
              { icon: <MapPin size={22} />, title: 'GPS Geofencing', desc: 'Define your classroom via coordinates. Scans outside the radius are instantly rejected.' },
              { icon: <ScanFace size={22} />, title: 'Rolling Tokens', desc: 'QR codes refresh every 15 seconds. Prevents taking screenshots and sending to dorms.' },
              { icon: <ShieldCheck size={22} />, title: 'Audit Ledger', desc: 'Every scan attempt and location ping is permanently logged for complete transparency.' },
            ].map((f, i) => (
              <motion.div key={i} variants={fadeUp} style={{ padding: 32, background: 'var(--bg-color)', border: '1px solid var(--border-color)', borderRadius: 8 }}>
                <div style={{ marginBottom: 16 }}>{f.icon}</div>
                <h3 style={{ fontSize: 18, marginBottom: 8, fontWeight: 600 }}>{f.title}</h3>
                <p style={{ fontSize: 15, lineHeight: 1.5, color: 'var(--text-secondary)' }}>{f.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section style={{ padding: '100px 24px', textAlign: 'center' }}>
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} style={{ maxWidth: 600, margin: '0 auto' }}>
          <h2 style={{ fontSize: '2.5rem', fontWeight: 700, letterSpacing: '-0.03em', marginBottom: 24 }}>Ready to stop proxy attendance?</h2>
          <p style={{ fontSize: '1.1rem', color: 'var(--text-secondary)', marginBottom: 32 }}>Takes 1 minute to setup. Free forever for standard classrooms.</p>
          <button className="btn-primary" onClick={() => navigate('/register')} style={{ padding: '12px 24px', fontSize: 15, borderRadius: 6, fontWeight: 500 }}>
            Create an account
          </button>
        </motion.div>
      </section>

      {/* Footer */}
      <footer style={{ padding: '32px 24px', textAlign: 'center', borderTop: '1px solid var(--border-color)' }}>
        <p style={{ fontSize: 13, color: 'var(--text-placeholder)', fontWeight: 500 }}>© {new Date().getFullYear()} QuickScan</p>
      </footer>
    </div>
  );
}
