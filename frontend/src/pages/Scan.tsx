import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Scanner } from '@yudiel/react-qr-scanner';
import { motion, AnimatePresence } from 'framer-motion';
import { api, getUser, logout, isLoggedIn, getHardwareId } from '../lib/api';
import { ScanFace, LogOut, MapPin, ShieldCheck, ShieldAlert, Navigation, ScanLine, XCircle } from 'lucide-react';

export default function Scan() {
  const navigate = useNavigate();
  const user = getUser();
  const [scanStatus, setScanStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [geoError, setGeoError] = useState('');

  useEffect(() => {
    if (!isLoggedIn()) { navigate('/login'); return; }
  }, [navigate]);

  useEffect(() => {
    if (!navigator.geolocation) { setGeoError('Geolocation not supported.'); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => setCoords({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
      () => setGeoError('Location access is required for anti-proxy validation.'),
      { enableHighAccuracy: true }
    );
  }, []);

  const handleScanSuccess = async (decodedText: string) => {
    if (scanStatus !== 'idle') return;
    setScanStatus('loading');
    try {
      let payload;
      try {
        payload = JSON.parse(decodedText);
      } catch {
        throw new Error('Invalid QR Code Format');
      }

      if (!coords) throw new Error('GPS unavailable. Enable location services.');

      const { data } = await api.post('/attendance/scan', {
        session_id: payload.session_id,
        qr_timestamp: payload.timestamp,
        hmac_signature: payload.hmac_signature,
        student_lat: coords.lat,
        student_lon: coords.lon,
        hardware_id: getHardwareId(),
      });
      setScanStatus('success');
      setMessage(data.message);
    } catch (err: any) {
      setScanStatus('error');
      setMessage(err.response?.data?.detail || err.message || 'Scan failed.');
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <nav className="navbar">
        <div className="container navbar-content">
          <Link to="/" className="logo" style={{ textDecoration: 'none' }}><ScanFace size={20} /> QuickScan</Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{user?.full_name}</span>
            <button className="btn-ghost" onClick={logout}><LogOut size={16} /></button>
          </div>
        </div>
      </nav>

      <div className="container" style={{ maxWidth: 500, padding: '32px 16px', flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <h1 style={{ fontSize: '1.75rem', marginBottom: 4 }}>Live Scanner</h1>
          <p className="text-secondary" style={{ fontSize: 14 }}>Point your camera at the instructor's QR projection.</p>
        </div>

        {/* GPS Status */}
        <div className="notion-block has-border" style={{ padding: 16, marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <MapPin size={16} />
              <span style={{ fontWeight: 500, fontSize: 14 }}>GPS Lock</span>
            </div>
            {coords ? (
              <span className="status-pill success"><Navigation size={12} /> Active</span>
            ) : (
              <span className="status-pill error">Pending</span>
            )}
          </div>
          {geoError && <p style={{ color: 'var(--error)', fontSize: 13, marginTop: 12 }}>{geoError}</p>}
          {coords && <p className="text-secondary" style={{ fontSize: 12, fontFamily: 'monospace', marginTop: 8 }}>{coords.lat.toFixed(5)}, {coords.lon.toFixed(5)}</p>}
        </div>

        {/* Scanner / Result Area */}
        <div style={{ position: 'relative', flex: 1, display: 'flex', flexDirection: 'column', minHeight: 400 }}>
          <AnimatePresence mode="wait">
            {scanStatus === 'success' ? (
              <motion.div 
                key="success"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ type: 'spring', bounce: 0.5 }}
                className="notion-block"
                style={{ width: '100%', padding: 48, textAlign: 'center', background: 'var(--success-bg)', border: '1px solid rgba(15, 123, 108, 0.2)' }}
              >
                <motion.div 
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                >
                  <ShieldCheck size={64} color="var(--success)" style={{ margin: '0 auto 16px' }} />
                </motion.div>
                <h2 style={{ color: 'var(--success)', fontSize: 20, marginBottom: 8, fontWeight: 700 }}>Attendance Logged</h2>
                <p style={{ color: 'var(--success)', fontSize: 14 }}>{message}</p>
                <button className="btn-ghost" style={{ marginTop: 32, border: '1px solid rgba(15,123,108,0.3)', color: 'var(--success)', padding: '10px 20px' }} onClick={() => setScanStatus('idle')}>Scan Another</button>
              </motion.div>

            ) : scanStatus === 'error' ? (
              <motion.div 
                key="error"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="notion-block" 
                style={{ width: '100%', padding: 48, textAlign: 'center', background: 'var(--error-bg)', border: '1px solid rgba(224,62,62,0.2)' }}
              >
                <ShieldAlert size={64} color="var(--error)" style={{ margin: '0 auto 16px' }} />
                <h2 style={{ color: 'var(--error)', fontSize: 20, marginBottom: 8, fontWeight: 700 }}>Scan Failed</h2>
                <p style={{ color: 'var(--error)', fontSize: 14 }}>{message}</p>
                <button className="btn-ghost" style={{ marginTop: 32, border: '1px solid rgba(224,62,62,0.3)', color: 'var(--error)', padding: '10px 20px' }} onClick={() => setScanStatus('idle')}><XCircle size={16} style={{ marginRight: 6, verticalAlign: -3 }}/> Try Again</button>
              </motion.div>
              
            ) : (
              <motion.div 
                key="scanner"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                style={{ width: '100%', opacity: coords ? 1 : 0.4, pointerEvents: coords ? 'auto' : 'none', transition: '0.3s' }}
              >
                <div style={{ borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-md)', background: '#000' }}>
                  <Scanner 
                    onScan={(results) => { if (results && results.length > 0) handleScanSuccess(results[0].rawValue) }} 
                    styles={{
                      container: { width: '100%', aspectRatio: '1/1' },
                    }}
                    allowMultiple={true}
                    scanDelay={500}
                  />
                </div>
                {scanStatus === 'loading' && (
                  <div style={{ textAlign: 'center', marginTop: 16 }}>
                    <div className="spinner" style={{ margin: '0 auto 12px' }}></div>
                    <p className="text-secondary" style={{ fontSize: 14 }}>Verifying securely...</p>
                  </div>
                )}
                <p className="text-secondary flex-center" style={{ marginTop: 16, fontSize: 13, gap: 6 }}><ScanLine size={14} /> Place QR inside the bounding box</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
