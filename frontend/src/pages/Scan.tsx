import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { api, getUser, logout, isLoggedIn, getHardwareId } from '../lib/api';
import { ScanFace, LogOut, MapPin, ShieldCheck, ShieldAlert, Navigation, ScanLine } from 'lucide-react';

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

  // GPS
  useEffect(() => {
    if (!navigator.geolocation) { setGeoError('Geolocation not supported.'); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => setCoords({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
      () => setGeoError('Location access is required for anti-proxy validation.'),
      { enableHighAccuracy: true }
    );
  }, []);

  // QR Scanner
  useEffect(() => {
    if (scanStatus === 'success' || scanStatus === 'loading') return;

    let scanner: Html5QrcodeScanner;
    const t = setTimeout(() => {
      scanner = new Html5QrcodeScanner("reader", { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1.0 }, false);
      scanner.render(handleScanSuccess, () => {});
    }, 300);

    return () => {
      clearTimeout(t);
      if (scanner) scanner.clear().catch(() => {});
    };
  }, [scanStatus]);

  const handleScanSuccess = async (decodedText: string) => {
    if (scanStatus === 'loading') return;
    setScanStatus('loading');
    try {
      const payload = JSON.parse(decodedText);
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
      setTimeout(() => setScanStatus('idle'), 4000);
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

      <div className="container" style={{ maxWidth: 500, padding: '32px 16px', flex: 1 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <h1 style={{ fontSize: '1.75rem', marginBottom: 4 }}>Scanner</h1>
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

        {/* Scanner / Result */}
        {scanStatus === 'success' ? (
          <div className="notion-block animate-fade-in" style={{ padding: 40, textAlign: 'center', background: 'var(--success-bg)', border: '1px solid rgba(15, 123, 108, 0.2)' }}>
            <ShieldCheck size={48} color="var(--success)" style={{ margin: '0 auto 16px' }} />
            <h2 style={{ color: 'var(--success)', fontSize: 18, marginBottom: 8 }}>Attendance Logged</h2>
            <p style={{ color: 'var(--success)', fontSize: 14 }}>{message}</p>
            <button className="btn-ghost" style={{ marginTop: 24, border: '1px solid rgba(15,123,108,0.3)', color: 'var(--success)' }} onClick={() => setScanStatus('idle')}>Scan Another</button>
          </div>
        ) : scanStatus === 'error' ? (
          <div className="notion-block animate-fade-in" style={{ padding: 40, textAlign: 'center', background: 'var(--error-bg)', border: '1px solid rgba(224,62,62,0.2)' }}>
            <ShieldAlert size={48} color="var(--error)" style={{ margin: '0 auto 16px' }} />
            <h2 style={{ color: 'var(--error)', fontSize: 18, marginBottom: 8 }}>Scan Failed</h2>
            <p style={{ color: 'var(--error)', fontSize: 14 }}>{message}</p>
          </div>
        ) : (
          <div style={{ opacity: coords ? 1 : 0.4, pointerEvents: coords ? 'auto' : 'none', transition: '0.3s' }}>
            <div id="reader" className="animate-fade-in" style={{ borderRadius: 'var(--radius-sm)', overflow: 'hidden', border: '1px solid var(--border-color)' }}></div>
            <p className="text-secondary flex-center" style={{ marginTop: 16, fontSize: 13, gap: 6 }}><ScanLine size={14} /> Place QR inside the bounding box</p>
          </div>
        )}
      </div>
    </div>
  );
}
