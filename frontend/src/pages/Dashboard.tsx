import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { api, getUser, logout, isLoggedIn } from '../lib/api';
import {
  ScanFace, LogOut, Play, RefreshCw, Plus, UserPlus, ShieldCheck,
  Clock, MapPin, Users, AlertCircle, X, Download, BarChart3,
  FileSpreadsheet, Shield, ChevronDown, Activity
} from 'lucide-react';

interface SessionItem {
  id: string; name: string; start_time: string; end_time: string;
  latitude: number | null; longitude: number | null; radius_meters: number;
}

interface AttendanceRow {
  student_id: string; full_name: string; email: string;
  device_id: string; status: string; scan_time: string | null;
  scan_lat: number | null; scan_lon: number | null;
}

interface Analytics {
  session_name: string; total_enrolled: number; total_present: number;
  total_absent: number; total_out_of_bounds: number; attendance_rate: number;
  geofence: { lat: number; lon: number; radius_m: number } | null;
}

interface LedgerEntry {
  id: string; action: string; target_id: string; timestamp: string;
  ip_address: string; actor_name: string; actor_email: string;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const user = getUser();
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [activeTab, setActiveTab] = useState<'sessions' | 'register' | 'analytics' | 'ledger'>('sessions');
  const [error, setError] = useState('');

  // QR state
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [qrPayload, setQrPayload] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // Create session modal
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newLat, setNewLat] = useState('');
  const [newLon, setNewLon] = useState('');
  const [newRadius, setNewRadius] = useState('100');
  const [creating, setCreating] = useState(false);

  // Enroll modal
  const [enrollSessionId, setEnrollSessionId] = useState<string | null>(null);
  const [enrollEmail, setEnrollEmail] = useState('');
  const [enrolling, setEnrolling] = useState(false);
  const [enrollMsg, setEnrollMsg] = useState('');

  // Attendance register
  const [registerData, setRegisterData] = useState<{ session_name: string; total_enrolled: number; total_present: number; total_absent: number; register: AttendanceRow[] } | null>(null);
  const [registerSessionId, setRegisterSessionId] = useState('');

  // Analytics
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [analyticsSessionId, setAnalyticsSessionId] = useState('');

  // Audit Ledger
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [ledgerTotal, setLedgerTotal] = useState(0);

  useEffect(() => {
    if (!isLoggedIn()) { navigate('/login'); return; }
    fetchSessions();
  }, [navigate]);

  const fetchSessions = async () => {
    try {
      const { data } = await api.get('/sessions');
      setSessions(data);
    } catch (err: any) { setError(err.response?.data?.detail || 'Failed to load sessions.'); }
  };

  const generateQR = async (sessionId: string) => {
    setLoading(true); setError(''); setActiveSessionId(sessionId);
    try {
      const { data } = await api.get(`/sessions/${sessionId}/qr`);
      setQrPayload(data);
    } catch (err: any) { setError(err.response?.data?.detail || 'Failed to generate QR.'); }
    finally { setLoading(false); }
  };

  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault(); setCreating(true); setError('');
    try {
      const now = new Date();
      const end = new Date(now.getTime() + 2 * 60 * 60 * 1000);
      await api.post('/sessions', {
        name: newName, start_time: now.toISOString(), end_time: end.toISOString(),
        latitude: newLat ? parseFloat(newLat) : null,
        longitude: newLon ? parseFloat(newLon) : null,
        radius_meters: parseInt(newRadius) || 100,
      });
      setShowCreate(false); setNewName(''); setNewLat(''); setNewLon('');
      fetchSessions();
    } catch (err: any) { setError(err.response?.data?.detail || 'Failed to create session.'); }
    finally { setCreating(false); }
  };

  const handleEnroll = async (e: React.FormEvent) => {
    e.preventDefault(); setEnrolling(true); setEnrollMsg('');
    try {
      const { data } = await api.post(`/sessions/${enrollSessionId}/enroll`, { student_email: enrollEmail });
      setEnrollMsg(data.message); setEnrollEmail('');
    } catch (err: any) { setEnrollMsg(err.response?.data?.detail || 'Enrollment failed.'); }
    finally { setEnrolling(false); }
  };

  const fillGeo = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => { setNewLat(pos.coords.latitude.toFixed(6)); setNewLon(pos.coords.longitude.toFixed(6)); },
      () => setError('GPS unavailable')
    );
  };

  // ATTENDANCE REGISTER
  const loadAttendanceRegister = async (sessionId: string) => {
    setRegisterSessionId(sessionId); setRegisterData(null); setError('');
    try {
      const { data } = await api.get(`/sessions/${sessionId}/attendance`);
      setRegisterData(data);
    } catch (err: any) { setError(err.response?.data?.detail || 'Failed to load attendance.'); }
  };

  const downloadExcel = async (sessionId: string) => {
    try {
      const response = await api.get(`/sessions/${sessionId}/attendance/export`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const a = document.createElement('a'); a.href = url;
      const disposition = response.headers['content-disposition'];
      const filename = disposition?.match(/filename="(.+)"/)?.[1] || 'attendance.xlsx';
      a.download = filename; document.body.appendChild(a); a.click(); a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) { setError(err.response?.data?.detail || 'Export failed.'); }
  };

  // ANALYTICS
  const loadAnalytics = async (sessionId: string) => {
    setAnalyticsSessionId(sessionId); setAnalytics(null); setError('');
    try {
      const { data } = await api.get(`/sessions/${sessionId}/analytics`);
      setAnalytics(data);
    } catch (err: any) { setError(err.response?.data?.detail || 'Failed to load analytics.'); }
  };

  // AUDIT LEDGER
  const loadLedger = async () => {
    setError('');
    try {
      const { data } = await api.get('/audit/ledger?limit=100');
      setLedger(data.entries); setLedgerTotal(data.total);
    } catch (err: any) { setError(err.response?.data?.detail || 'Failed to load ledger.'); }
  };

  useEffect(() => {
    if (activeTab === 'ledger') loadLedger();
  }, [activeTab]);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-secondary)' }}>
      {/* Nav */}
      <nav className="navbar">
        <div className="container navbar-content" style={{ maxWidth: 1200 }}>
          <Link to="/" className="logo" style={{ textDecoration: 'none' }}><ScanFace size={20} /> QuickScan</Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{user?.full_name}</span>
            <button className="btn-ghost" onClick={logout}><LogOut size={16} /></button>
          </div>
        </div>
      </nav>

      <div className="container" style={{ maxWidth: 1200, paddingTop: 32, paddingBottom: 40, flex: 1 }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h1 style={{ fontSize: '1.75rem' }}>Dashboard</h1>
          <button className="btn-primary" onClick={() => setShowCreate(true)}><Plus size={16} /> New Session</button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 24, padding: 4, background: 'var(--bg-color)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
          {([
            ['sessions', 'Sessions', <ScanFace size={15} />],
            ['register', 'Attendance', <FileSpreadsheet size={15} />],
            ['analytics', 'Analytics', <BarChart3 size={15} />],
            ['ledger', 'Audit Ledger', <Shield size={15} />],
          ] as const).map(([key, label, icon]) => (
            <button key={key} className="btn-ghost" style={{
              flex: 1, justifyContent: 'center',
              background: activeTab === key ? 'var(--bg-secondary)' : 'transparent',
              fontWeight: activeTab === key ? 600 : 400,
              boxShadow: activeTab === key ? 'var(--shadow-sm)' : 'none',
            }} onClick={() => setActiveTab(key as any)}>
              {icon} {label}
            </button>
          ))}
        </div>

        {error && <div className="alert alert-error animate-fade-in" style={{ marginBottom: 16 }}><AlertCircle size={16} />{error}</div>}

        {/* ═══ SESSIONS TAB ═══ */}
        {activeTab === 'sessions' && (
          <div className="dashboard-grid">
            <div>
              <h2 style={{ fontSize: 15, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}><Clock size={16} /> My Sessions ({sessions.length})</h2>
              {sessions.length === 0 && (
                <div className="notion-block has-border" style={{ padding: 32, textAlign: 'center' }}>
                  <p className="text-secondary">No sessions yet. Click "New Session" to get started.</p>
                </div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {sessions.map(s => (
                  <div key={s.id} className="notion-block has-border" style={{ padding: 16, background: activeSessionId === s.id ? 'var(--bg-color)' : 'var(--bg-color)' }}>
                    <h3 style={{ fontSize: 14, margin: '0 0 4px' }}>{s.name}</h3>
                    <p style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--text-placeholder)', margin: '0 0 10px' }}>{s.id}</p>
                    <div style={{ display: 'flex', gap: 6, fontSize: 12, color: 'var(--text-secondary)', marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                      <Clock size={12} /> {new Date(s.start_time).toLocaleString()}
                      {s.latitude && <><MapPin size={12} /> {s.latitude.toFixed(2)}, {s.longitude?.toFixed(2)}</>}
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      <button className="btn-primary" style={{ padding: '5px 10px', fontSize: 12 }} onClick={() => generateQR(s.id)}><Play size={13} /> Project</button>
                      <button className="btn-secondary" style={{ padding: '5px 10px', fontSize: 12 }} onClick={() => { setEnrollSessionId(s.id); setEnrollMsg(''); }}><UserPlus size={13} /> Enroll</button>
                      <button className="btn-ghost" style={{ padding: '5px 10px', fontSize: 12 }} onClick={() => { setActiveTab('register'); loadAttendanceRegister(s.id); }}><FileSpreadsheet size={13} /> Register</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {/* QR Projection */}
            <div>
              <h2 style={{ fontSize: 15, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}><ScanFace size={16} /> Live Projection</h2>
              <div className="notion-block has-border flex-center" style={{ minHeight: 380, flexDirection: 'column', background: 'var(--bg-color)' }}>
                {!qrPayload ? (
                  <div style={{ textAlign: 'center', color: 'var(--text-placeholder)', padding: 40 }}>
                    <ScanFace size={48} strokeWidth={1} style={{ margin: '0 auto 16px' }} />
                    <p>Select a session → "Project"</p>
                  </div>
                ) : (
                  <div className="animate-fade-in" style={{ textAlign: 'center', padding: 24 }}>
                    <div style={{ background: '#fff', padding: 20, borderRadius: 16, boxShadow: 'var(--shadow-sm)', display: 'inline-block' }}>
                      <QRCodeSVG value={JSON.stringify(qrPayload)} size={220} level="H" bgColor="#fff" fgColor="#37352f" />
                    </div>
                    <div style={{ marginTop: 16 }}>
                      <p style={{ letterSpacing: '0.06em', fontSize: 13, fontWeight: 600 }}>SCAN TO ATTEND</p>
                      <p className="text-secondary" style={{ fontSize: 12 }}>Token: {qrPayload.timestamp}</p>
                      {qrPayload.class_lat && (
                        <div className="status-pill success" style={{ marginTop: 8, fontSize: 11 }}>
                          <ShieldCheck size={12} /> Geofence ON
                        </div>
                      )}
                    </div>
                    <button className="btn-secondary" style={{ marginTop: 16, fontSize: 12 }} onClick={() => generateQR(activeSessionId!)}>
                      <RefreshCw size={13} /> Regenerate
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ═══ ATTENDANCE REGISTER TAB ═══ */}
        {activeTab === 'register' && (
          <div>
            {/* Session selector */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 24, alignItems: 'end', flexWrap: 'wrap' }}>
              <div className="form-group" style={{ flex: 1, minWidth: 200, marginBottom: 0 }}>
                <label style={{ fontSize: 13 }}>Select Session</label>
                <select className="input-base" value={registerSessionId} onChange={e => { if (e.target.value) loadAttendanceRegister(e.target.value); }}>
                  <option value="">Choose a session…</option>
                  {sessions.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              {registerSessionId && (
                <button className="btn-primary" style={{ padding: '8px 16px', fontSize: 13, marginBottom: 0 }} onClick={() => downloadExcel(registerSessionId)}>
                  <Download size={14} /> Export Excel
                </button>
              )}
            </div>

            {/* Register table */}
            {registerData ? (
              <div className="animate-fade-in">
                {/* Stats bar */}
                <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
                  {[
                    { label: 'Enrolled', value: registerData.total_enrolled, color: 'var(--text-primary)' },
                    { label: 'Present', value: registerData.total_present, color: 'var(--success)' },
                    { label: 'Absent', value: registerData.total_absent, color: 'var(--error)' },
                  ].map((s, i) => (
                    <div key={i} className="notion-block has-border" style={{ flex: 1, minWidth: 120, padding: '16px 20px', textAlign: 'center', background: 'var(--bg-color)' }}>
                      <p style={{ fontSize: 28, fontWeight: 700, color: s.color, lineHeight: 1 }}>{s.value}</p>
                      <p className="text-secondary" style={{ fontSize: 12, marginTop: 4 }}>{s.label}</p>
                    </div>
                  ))}
                </div>

                {/* Table */}
                <div className="notion-block has-border" style={{ overflow: 'auto', background: 'var(--bg-color)' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                      <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)' }}>
                        <th style={thStyle}>#</th>
                        <th style={{ ...thStyle, textAlign: 'left' }}>Student</th>
                        <th style={{ ...thStyle, textAlign: 'left' }}>Email</th>
                        <th style={thStyle}>Device ID</th>
                        <th style={thStyle}>Status</th>
                        <th style={thStyle}>Scan Time</th>
                        <th style={thStyle}>Location</th>
                      </tr>
                    </thead>
                    <tbody>
                      {registerData.register.map((r, i) => (
                        <tr key={r.student_id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                          <td style={tdStyle}>{i + 1}</td>
                          <td style={{ ...tdStyle, textAlign: 'left', fontWeight: 500 }}>{r.full_name}</td>
                          <td style={{ ...tdStyle, textAlign: 'left', fontFamily: 'monospace', fontSize: 12 }}>{r.email}</td>
                          <td style={tdStyle}>
                            <span style={{
                              fontFamily: 'monospace', fontSize: 11, padding: '2px 6px', borderRadius: 4,
                              background: r.device_id === 'NOT BOUND' ? 'var(--error-bg)' : 'var(--bg-secondary)',
                              color: r.device_id === 'NOT BOUND' ? 'var(--error)' : 'var(--text-secondary)',
                            }}>{r.device_id === 'NOT BOUND' ? '⚠ NOT BOUND' : r.device_id.slice(0, 16) + '…'}</span>
                          </td>
                          <td style={tdStyle}>
                            <span className={`status-pill ${r.status === 'Present' ? 'success' : r.status === 'Out of Bounds' ? 'warning' : 'error'}`}>
                              {r.status}
                            </span>
                          </td>
                          <td style={{ ...tdStyle, fontFamily: 'monospace', fontSize: 12 }}>{r.scan_time ? new Date(r.scan_time).toLocaleTimeString() : '—'}</td>
                          <td style={{ ...tdStyle, fontFamily: 'monospace', fontSize: 11 }}>
                            {r.scan_lat ? `${r.scan_lat.toFixed(4)}, ${r.scan_lon?.toFixed(4)}` : '—'}
                          </td>
                        </tr>
                      ))}
                      {registerData.register.length === 0 && (
                        <tr><td colSpan={7} style={{ ...tdStyle, textAlign: 'center', color: 'var(--text-placeholder)', padding: 32 }}>No students enrolled in this session.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="notion-block has-border flex-center" style={{ padding: 48, background: 'var(--bg-color)' }}>
                <div style={{ textAlign: 'center', color: 'var(--text-placeholder)' }}>
                  <FileSpreadsheet size={40} strokeWidth={1} style={{ margin: '0 auto 12px' }} />
                  <p>Select a session above to view the attendance register.</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ═══ ANALYTICS TAB ═══ */}
        {activeTab === 'analytics' && (
          <div>
            <div className="form-group" style={{ maxWidth: 400, marginBottom: 24 }}>
              <label style={{ fontSize: 13 }}>Select Session</label>
              <select className="input-base" value={analyticsSessionId} onChange={e => { if (e.target.value) loadAnalytics(e.target.value); }}>
                <option value="">Choose a session…</option>
                {sessions.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>

            {analytics ? (
              <div className="animate-fade-in">
                <h2 style={{ fontSize: 18, marginBottom: 20 }}>{analytics.session_name}</h2>
                {/* Stat cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 32 }}>
                  <StatCard label="Enrollment" value={analytics.total_enrolled} icon={<Users size={20} />} />
                  <StatCard label="Present" value={analytics.total_present} icon={<ShieldCheck size={20} />} color="var(--success)" />
                  <StatCard label="Absent" value={analytics.total_absent} icon={<X size={20} />} color="var(--error)" />
                  <StatCard label="Out of Bounds" value={analytics.total_out_of_bounds} icon={<MapPin size={20} />} color="#d29922" />
                  <StatCard label="Attendance Rate" value={`${analytics.attendance_rate}%`} icon={<Activity size={20} />} color="var(--accent-primary)" />
                </div>
                {/* Attendance bar */}
                <div className="notion-block has-border" style={{ padding: 20, background: 'var(--bg-color)' }}>
                  <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>Attendance Distribution</p>
                  <div style={{ height: 32, borderRadius: 8, overflow: 'hidden', display: 'flex', background: 'var(--bg-secondary)' }}>
                    {analytics.total_enrolled > 0 && (
                      <>
                        <div style={{ width: `${analytics.attendance_rate}%`, background: 'var(--success)', transition: 'width 0.6s ease' }}></div>
                        {analytics.total_out_of_bounds > 0 && (
                          <div style={{ width: `${(analytics.total_out_of_bounds / analytics.total_enrolled) * 100}%`, background: '#d29922' }}></div>
                        )}
                      </>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 16, marginTop: 8, fontSize: 12 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 10, height: 10, borderRadius: 2, background: 'var(--success)', display: 'inline-block' }}></span> Present</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 10, height: 10, borderRadius: 2, background: '#d29922', display: 'inline-block' }}></span> Out of Bounds</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 10, height: 10, borderRadius: 2, background: 'var(--bg-secondary)', display: 'inline-block' }}></span> Absent</span>
                  </div>
                </div>
                {analytics.geofence && (
                  <div className="notion-block has-border" style={{ padding: 16, marginTop: 12, background: 'var(--bg-color)', fontSize: 13 }}>
                    <p style={{ fontWeight: 600, marginBottom: 4 }}><MapPin size={14} style={{ verticalAlign: -2 }} /> Geofence Configuration</p>
                    <p className="text-secondary">Center: {analytics.geofence.lat.toFixed(5)}, {analytics.geofence.lon.toFixed(5)} — Radius: {analytics.geofence.radius_m}m</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="notion-block has-border flex-center" style={{ padding: 48, background: 'var(--bg-color)' }}>
                <div style={{ textAlign: 'center', color: 'var(--text-placeholder)' }}>
                  <BarChart3 size={40} strokeWidth={1} style={{ margin: '0 auto 12px' }} />
                  <p>Select a session to view analytics.</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ═══ AUDIT LEDGER TAB ═══ */}
        {activeTab === 'ledger' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <p className="text-secondary" style={{ fontSize: 13 }}>
                <Shield size={14} style={{ verticalAlign: -2 }} /> {ledgerTotal} total security events
              </p>
              <button className="btn-ghost" style={{ fontSize: 12 }} onClick={loadLedger}><RefreshCw size={13} /> Refresh</button>
            </div>
            <div className="notion-block has-border" style={{ overflow: 'auto', background: 'var(--bg-color)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)' }}>
                    <th style={thStyle}>Timestamp</th>
                    <th style={{ ...thStyle, textAlign: 'left' }}>Action</th>
                    <th style={{ ...thStyle, textAlign: 'left' }}>Actor</th>
                    <th style={thStyle}>Target ID</th>
                    <th style={thStyle}>IP Address</th>
                  </tr>
                </thead>
                <tbody>
                  {ledger.map(e => (
                    <tr key={e.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ ...tdStyle, fontFamily: 'monospace', fontSize: 11 }}>{new Date(e.timestamp).toLocaleString()}</td>
                      <td style={{ ...tdStyle, textAlign: 'left' }}>
                        <span style={{
                          padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600,
                          background: e.action.includes('QR') ? 'rgba(46, 170, 220, 0.1)' : e.action.includes('FAIL') ? 'var(--error-bg)' : 'var(--bg-secondary)',
                          color: e.action.includes('QR') ? '#2eaadc' : e.action.includes('FAIL') ? 'var(--error)' : 'var(--text-primary)',
                        }}>{e.action}</span>
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'left' }}>
                        <span style={{ fontWeight: 500 }}>{e.actor_name}</span>
                        <br /><span style={{ fontSize: 11, color: 'var(--text-placeholder)' }}>{e.actor_email}</span>
                      </td>
                      <td style={{ ...tdStyle, fontFamily: 'monospace', fontSize: 11 }}>{e.target_id.slice(0, 8)}…</td>
                      <td style={{ ...tdStyle, fontFamily: 'monospace', fontSize: 11 }}>{e.ip_address}</td>
                    </tr>
                  ))}
                  {ledger.length === 0 && (
                    <tr><td colSpan={5} style={{ ...tdStyle, textAlign: 'center', padding: 32, color: 'var(--text-placeholder)' }}>No audit events recorded yet. Generate a QR code to create the first entry.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* ═══ CREATE SESSION MODAL ═══ */}
      {showCreate && (
        <div style={modalOverlay}>
          <div className="notion-block has-border animate-fade-in" style={{ ...modalBox, maxWidth: 440 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h2 style={{ fontSize: 18 }}>New Session</h2>
              <button className="btn-ghost" onClick={() => setShowCreate(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleCreateSession}>
              <div className="form-group">
                <label>Session Name</label>
                <input className="input-base" placeholder="e.g. Data Structures Lecture 5" value={newName} onChange={e => setNewName(e.target.value)} required />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group"><label>Latitude</label><input className="input-base" placeholder="28.6139" value={newLat} onChange={e => setNewLat(e.target.value)} /></div>
                <div className="form-group"><label>Longitude</label><input className="input-base" placeholder="77.2090" value={newLon} onChange={e => setNewLon(e.target.value)} /></div>
              </div>
              <button type="button" className="btn-ghost" style={{ marginBottom: 16, fontSize: 12, color: 'var(--accent-primary)' }} onClick={fillGeo}><MapPin size={13} /> Use my current location</button>
              <div className="form-group"><label>Radius (meters)</label><input className="input-base" type="number" value={newRadius} onChange={e => setNewRadius(e.target.value)} /></div>
              <button type="submit" className="btn-primary" style={{ width: '100%', padding: '10px' }} disabled={creating}>{creating ? 'Creating…' : 'Create Session'}</button>
            </form>
          </div>
        </div>
      )}

      {/* ═══ ENROLL MODAL ═══ */}
      {enrollSessionId && (
        <div style={modalOverlay}>
          <div className="notion-block has-border animate-fade-in" style={{ ...modalBox, maxWidth: 400 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h2 style={{ fontSize: 18 }}><Users size={18} /> Enroll Student</h2>
              <button className="btn-ghost" onClick={() => setEnrollSessionId(null)}><X size={18} /></button>
            </div>
            {enrollMsg && <div className={`alert ${enrollMsg.includes('success') ? 'alert-success' : 'alert-error'} animate-fade-in`} style={{ marginBottom: 16 }}>{enrollMsg}</div>}
            <form onSubmit={handleEnroll}>
              <div className="form-group"><label>Student Email</label><input className="input-base" type="email" placeholder="student@institution.edu" value={enrollEmail} onChange={e => setEnrollEmail(e.target.value)} required /></div>
              <button type="submit" className="btn-primary" style={{ width: '100%', padding: '10px' }} disabled={enrolling}>{enrolling ? 'Enrolling…' : 'Enroll Student'}</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Helpers ──
function StatCard({ label, value, icon, color }: { label: string; value: number | string; icon: React.ReactNode; color?: string }) {
  return (
    <div className="notion-block has-border" style={{ padding: '20px 16px', textAlign: 'center', background: 'var(--bg-color)' }}>
      <div style={{ color: color || 'var(--text-secondary)', margin: '0 auto 8px' }}>{icon}</div>
      <p style={{ fontSize: 26, fontWeight: 700, lineHeight: 1, color: color || 'var(--text-primary)' }}>{value}</p>
      <p className="text-secondary" style={{ fontSize: 11, marginTop: 4 }}>{label}</p>
    </div>
  );
}

const thStyle: React.CSSProperties = { padding: '10px 12px', fontWeight: 600, fontSize: 12, textAlign: 'center', whiteSpace: 'nowrap' };
const tdStyle: React.CSSProperties = { padding: '10px 12px', textAlign: 'center', whiteSpace: 'nowrap' };
const modalOverlay: React.CSSProperties = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 24 };
const modalBox: React.CSSProperties = { width: '100%', padding: 32, background: 'var(--bg-color)' };
