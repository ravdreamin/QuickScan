import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { api, getUser, logout, isLoggedIn } from '../lib/api';
import {
  ScanFace, LogOut, Play, RefreshCw, Plus, UserPlus, ShieldCheck,
  Clock, MapPin, Users, AlertCircle, X,
  FileSpreadsheet, Shield, Activity
} from 'lucide-react';

interface SessionItem {
  id: string; name: string; start_time: string; end_time: string;
  latitude: number | null; longitude: number | null; radius_meters: number;
  enrollment_code: string;
}

interface SessionStudentRow {
  student_id: string; roll_no: string; full_name: string; email: string;
  device_id: string; status: string; scan_time: string | null;
  scan_lat: number | null; scan_lon: number | null;
}

interface SessionStudentsData {
  session_id: string;
  session_name: string;
  total_enrolled: number;
  total_present: number;
  total_absent: number;
  register: SessionStudentRow[];
}

interface AttendanceMatrixColumn {
  session_id: string;
  date: string;
}

interface AttendanceMatrixCell {
  session_id: string;
  status: string | null;
}

interface AttendanceMatrixRow {
  student_id: string;
  roll_no: string;
  full_name: string;
  email: string;
  device_id: string;
  total_classes: number;
  total_attended: number;
  total_missed: number;
  attendance_rate: number;
  records: AttendanceMatrixCell[];
}

interface SessionAttendanceMatrixData {
  session_id: string;
  session_name: string;
  columns: AttendanceMatrixColumn[];
  rows: AttendanceMatrixRow[];
  summary: {
    total_students: number;
    total_dates: number;
  };
}

interface StudentProfile {
  student_id: string;
  full_name: string;
  email: string;
  roll_no: string;
  device_id: string;
}

interface StudentAttendanceEntry {
  session_id: string;
  session_name: string;
  date: string;
  status: string;
  scan_time: string | null;
  roll_no: string;
  email: string;
  device_id: string;
}

interface StudentCourseStat {
  course_name: string;
  total_classes: number;
  attended: number;
  missed: number;
}

interface StudentDashboardStats {
  profile: StudentProfile;
  overall: {
    total_classes: number;
    total_attended: number;
    total_missed: number;
  };
  by_course: StudentCourseStat[];
  attendance_register: StudentAttendanceEntry[];
}

interface StudentEditForm {
  roll_no: string;
  email: string;
  device_id: string;
}

interface EditableStudent {
  student_id: string;
  roll_no: string;
  full_name: string;
  email: string;
  device_id: string;
}

interface LedgerEntry {
  id: string; action: string; target_id: string; timestamp: string;
  ip_address: string; actor_name: string; actor_email: string;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const user = getUser();
  const isStudent = user?.role === 'student';
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [activeTab, setActiveTab] = useState<'sessions' | 'register' | 'students' | 'ledger'>('sessions');
  const [error, setError] = useState('');

  // QR state
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [qrPayload, setQrPayload] = useState<any>(null);

  // Create session modal
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newLat, setNewLat] = useState('');
  const [newLon, setNewLon] = useState('');
  const [newRadius, setNewRadius] = useState('100');
  const [creating, setCreating] = useState(false);

  // Enroll modal
  const [enrollSessionId, setEnrollSessionId] = useState<string | null>(null);
  const [enrollEmails, setEnrollEmails] = useState('');
  const [enrolling, setEnrolling] = useState(false);
  const [enrollMsg, setEnrollMsg] = useState('');

  // Attendance register
  const [registerData, setRegisterData] = useState<SessionAttendanceMatrixData | null>(null);
  const [registerSessionId, setRegisterSessionId] = useState('');
  const [studentsData, setStudentsData] = useState<SessionStudentsData | null>(null);
  const [studentsSessionId, setStudentsSessionId] = useState('');

  const [studentStats, setStudentStats] = useState<StudentDashboardStats | null>(null);

  // Student join code
  const [joinCode, setJoinCode] = useState('');
  const [joining, setJoining] = useState(false);
  const [joinMsg, setJoinMsg] = useState('');

  // Students Overview
  const [highlightStudentId, setHighlightStudentId] = useState<string | null>(null);
  const [studentMessage, setStudentMessage] = useState('');
  const [editingStudent, setEditingStudent] = useState<EditableStudent | null>(null);
  const [editForm, setEditForm] = useState<StudentEditForm>({ roll_no: '', email: '', device_id: '' });
  const [savingStudent, setSavingStudent] = useState(false);

  // Audit Ledger
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [ledgerTotal, setLedgerTotal] = useState(0);

  useEffect(() => {
    if (!isLoggedIn()) { navigate('/login'); return; }
    if (isStudent) {
      fetchStudentStats();
    } else {
      fetchSessions();
    }
  }, [isStudent, navigate]);

  const fetchStudentStats = async () => {
    try {
      const { data } = await api.get('/sessions/student/stats');
      setStudentStats(data);
    } catch (err: any) { setError(err.response?.data?.detail || 'Failed to load stats.'); }
  };

  const fetchSessions = async () => {
    try {
      const { data } = await api.get('/sessions');
      setSessions(data);
    } catch (err: any) { setError(err.response?.data?.detail || 'Failed to load sessions.'); }
  };

  const generateQR = async (sessionId: string, manual: boolean = false) => {
    setError(''); setActiveSessionId(sessionId);
    try {
      const { data } = await api.get(`/sessions/${sessionId}/qr${manual ? '?manual=true' : ''}`);
      setQrPayload(data);
    } catch (err: any) { 
      setError(err.response?.data?.detail || 'Failed to generate QR.'); 
      setQrPayload(null);
    }
  };

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (activeSessionId && activeTab === 'sessions' && qrPayload) {
      interval = setInterval(() => {
        api.get(`/sessions/${activeSessionId}/qr`)
           .then(({ data }) => setQrPayload(data))
           .catch((err: any) => { 
             setError(err.response?.data?.detail || 'Failed to generate QR.'); 
             setQrPayload(null);
             clearInterval(interval);
           });
      }, 15000);
    }
    return () => clearInterval(interval);
  }, [activeSessionId, activeTab, qrPayload]);

  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  useEffect(() => {
    let timerId: ReturnType<typeof setInterval>;
    if (qrPayload?.window_closes_at) {
      const updateTimer = () => {
        const now = Math.floor(Date.now() / 1000);
        const remaining = qrPayload.window_closes_at - now;
        setTimeLeft(remaining > 0 ? remaining : 0);
      };
      updateTimer();
      timerId = setInterval(updateTimer, 1000);
    } else {
      setTimeLeft(null);
    }
    return () => clearInterval(timerId);
  }, [qrPayload?.window_closes_at]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
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
      const emailList = enrollEmails.split(/[,;\n]+/).map(e => e.trim()).filter(e => e);
      if (emailList.length === 0) throw new Error("Please enter at least one valid email.");
      const { data } = await api.post(`/sessions/${enrollSessionId}/enroll/bulk`, { student_emails: emailList });
      setEnrollMsg(data.message); setEnrollEmails('');
    } catch (err: any) { setEnrollMsg(err.response?.data?.detail || err.message || 'Enrollment failed.'); }
    finally { setEnrolling(false); }
  };

  const handleJoinSession = async (e: React.FormEvent) => {
    e.preventDefault(); setJoining(true); setJoinMsg(''); setError('');
    if (!joinCode.trim()) { setJoining(false); return; }
    try {
      const { data } = await api.post('/sessions/join', { code: joinCode.trim() });
      setJoinMsg(data.message); setJoinCode('');
      // Reload stats after successful join
      fetchStudentStats();
    } catch (err: any) { setJoinMsg(err.response?.data?.detail || 'Failed to join session.'); }
    finally { setJoining(false); }
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
      const { data } = await api.get(`/sessions/${sessionId}/attendance/matrix`);
      setRegisterData(data);
    } catch (err: any) { setError(err.response?.data?.detail || 'Failed to load attendance.'); }
  };

  // STUDENTS
  const loadStudentsForSession = async (sessionId: string) => {
    setStudentsSessionId(sessionId);
    setStudentsData(null);
    setError('');
    try {
      const { data } = await api.get(`/sessions/${sessionId}/attendance`);
      setStudentsData(data);
    } catch (err: any) { setError(err.response?.data?.detail || 'Failed to load students.'); }
  };

  const openStudentEditor = (student: EditableStudent) => {
    setStudentMessage('');
    setError('');
    setEditingStudent(student);
    setEditForm({
      roll_no: student.roll_no === 'N/A' ? '' : student.roll_no,
      email: student.email,
      device_id: student.device_id === 'NOT BOUND' ? '' : student.device_id,
    });
  };

  const closeStudentEditor = () => {
    setEditingStudent(null);
    setEditForm({ roll_no: '', email: '', device_id: '' });
    setSavingStudent(false);
  };

  const handleStudentUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent) return;

    setSavingStudent(true);
    setStudentMessage('');
    setError('');

    try {
      await api.put(`/sessions/students/${editingStudent.student_id}`, {
        roll_no: editForm.roll_no,
        email: editForm.email,
        device_id: editForm.device_id,
      });
      if (studentsSessionId) {
        await loadStudentsForSession(studentsSessionId);
      }
      if (registerSessionId) {
        await loadAttendanceRegister(registerSessionId);
      }
      setStudentMessage(`Updated ${editingStudent.full_name}.`);
      closeStudentEditor();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to update student.');
      setSavingStudent(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'register') {
      const defaultSessionId = registerSessionId || studentsSessionId || activeSessionId || sessions[0]?.id;
      if (defaultSessionId && defaultSessionId !== registerSessionId) {
        loadAttendanceRegister(defaultSessionId);
      }
    }
    if (activeTab === 'students') {
      const defaultSessionId = studentsSessionId || registerSessionId || activeSessionId || sessions[0]?.id;
      if (defaultSessionId && defaultSessionId !== studentsSessionId) {
        loadStudentsForSession(defaultSessionId);
      }
    }
    if (activeTab === 'ledger') loadLedger();
  }, [activeTab, activeSessionId, registerSessionId, sessions, studentsSessionId]);

  useEffect(() => {
    if (activeTab === 'students' && highlightStudentId) {
      const studentCard = document.getElementById(`student-${highlightStudentId}`);
      studentCard?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [activeTab, studentsData, highlightStudentId]);

  const loadLedger = async () => {
    setError('');
    try {
      const { data } = await api.get('/audit/ledger?limit=100');
      setLedger(data.entries); setLedgerTotal(data.total);
    } catch (err: any) { setError(err.response?.data?.detail || 'Failed to load ledger.'); }
  };

  const selectedRegisterSession = sessions.find((session) => session.id === registerSessionId) ?? null;
  const selectedStudentsSession = sessions.find((session) => session.id === studentsSessionId) ?? null;

  const jumpToStudentDetails = (studentId: string) => {
    setHighlightStudentId(studentId);
    if (registerSessionId) {
      setStudentsSessionId(registerSessionId);
      loadStudentsForSession(registerSessionId);
    }
    setActiveTab('students');
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-color)' }}>
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
          {isStudent ? (
            <Link to="/scan" className="btn-primary" style={{ textDecoration: 'none' }}><ScanFace size={16} /> Scan QR</Link>
          ) : (
            <button className="btn-primary" onClick={() => setShowCreate(true)}><Plus size={16} /> New Session</button>
          )}
        </div>

        {error && <div className="alert alert-error animate-fade-in" style={{ marginBottom: 16 }}><AlertCircle size={16} />{error}</div>}

        {/* ═══ STUDENT VIEW ═══ */}
        {isStudent ? (
          <div>
            {studentStats ? (
              <div className="animate-fade-in">
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 32 }}>
                  <StatCard label="Total Classes" value={studentStats.overall.total_classes} icon={<FileSpreadsheet size={20} />} />
                  <StatCard label="Attended" value={studentStats.overall.total_attended} icon={<ShieldCheck size={20} />} color="var(--success)" />
                  <StatCard label="Missed" value={studentStats.overall.total_missed} icon={<X size={20} />} color="var(--error)" />
                  <StatCard label="Overall Rate" value={`${studentStats.overall.total_classes ? Math.round((studentStats.overall.total_attended / studentStats.overall.total_classes) * 100) : 0}%`} icon={<Activity size={20} />} color="var(--accent-primary)" />
                </div>
                
                <div className="notion-block has-border" style={{ marginBottom: 32, padding: 24, background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
                  <div>
                    <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>Join a New Session</h3>
                    <p className="text-secondary" style={{ fontSize: 13 }}>Ask your teacher for the 6-character enrollment code.</p>
                  </div>
                  <form onSubmit={handleJoinSession} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input className="input-base" style={{ width: 140, textTransform: 'uppercase' }} placeholder="e.g. A1B2C3" value={joinCode} onChange={e => setJoinCode(e.target.value)} maxLength={6} required />
                    <button type="submit" className="btn-primary" disabled={joining}>{joining ? 'Joining…' : 'Join'}</button>
                  </form>
                  {joinMsg && <div style={{ flexBasis: '100%', fontSize: 13, color: joinMsg.includes('Success') ? 'var(--success)' : 'var(--error)' }}>{joinMsg}</div>}
                </div>

                <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, color: 'var(--text-secondary)' }}>My Courses</h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
                  {studentStats.by_course.map((c, i) => (
                    <div key={i} className="notion-block" style={{ padding: 20, border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)' }}>
                      <h3 style={{ fontSize: 16, fontWeight: 600, margin: '0 0 16px' }}>{c.course_name}</h3>
                      <div style={{ display: 'flex', gap: 12, fontSize: 13, background: 'var(--bg-secondary)', padding: 12, borderRadius: 'var(--radius-md)' }}>
                        <div style={{ flex: 1 }}>
                          <span className="text-secondary" style={{ display: 'block', fontSize: 11, marginBottom: 4 }}>Total</span>
                          <span style={{ fontWeight: 600 }}>{c.total_classes}</span>
                        </div>
                        <div style={{ flex: 1 }}>
                          <span className="text-secondary" style={{ display: 'block', fontSize: 11, marginBottom: 4 }}>Attended</span>
                          <span style={{ fontWeight: 600, color: 'var(--success)' }}>{c.attended}</span>
                        </div>
                        <div style={{ flex: 1 }}>
                          <span className="text-secondary" style={{ display: 'block', fontSize: 11, marginBottom: 4 }}>Missed</span>
                          <span style={{ fontWeight: 600, color: 'var(--error)' }}>{c.missed}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                  {studentStats.by_course.length === 0 && (
                    <p className="text-secondary">You are not enrolled in any sessions yet.</p>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-secondary">Loading stats...</p>
            )}
          </div>
        ) : (
          /* ═══ TEACHER VIEW ═══ */
          <>
            {/* Tabs */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 32, paddingBottom: 12, borderBottom: '1px solid var(--border-color)' }}>
          {([
            ['sessions', 'Sessions', <ScanFace size={16} />],
            ['register', 'Attendance', <FileSpreadsheet size={16} />],
            ['students', 'Students', <Users size={16} />],
            ['ledger', 'Audit Ledger', <Shield size={16} />],
          ] as const).map(([key, label, icon]) => (
            <button key={key} className="btn-ghost" style={{
              background: activeTab === key ? 'var(--bg-secondary)' : 'transparent',
              color: activeTab === key ? 'var(--text-primary)' : 'var(--text-secondary)',
              fontWeight: activeTab === key ? 500 : 400,
              padding: '6px 14px',
              borderRadius: 'var(--radius-sm)',
            }} onClick={() => setActiveTab(key as any)}>
              {icon} {label}
            </button>
          ))}
        </div>

        {/* ═══ SESSIONS TAB ═══ */}
        {activeTab === 'sessions' && (
          <div className="dashboard-grid">
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}><Clock size={16} color="var(--text-secondary)" /> My Sessions ({sessions.length})</h2>
              {sessions.length === 0 && (
                <div style={{ padding: '32px 16px', textAlign: 'center', border: '1px dashed var(--border-color)', borderRadius: 'var(--radius-md)' }}>
                  <p className="text-secondary" style={{ fontSize: 14 }}>No sessions yet. Click "New Session" to get started.</p>
                </div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {sessions.map(s => (
                  <div key={s.id} onClick={() => setActiveSessionId(s.id)} style={{
                    padding: 16, 
                    background: activeSessionId === s.id ? 'var(--bg-secondary)' : 'transparent',
                    border: '1px solid',
                    borderColor: activeSessionId === s.id ? 'var(--border-color)' : 'transparent',
                    borderRadius: 'var(--radius-md)',
                    cursor: 'pointer',
                    transition: 'background 0.1s ease',
                  }}
                  onMouseEnter={(e) => {
                    if (activeSessionId !== s.id) e.currentTarget.style.background = 'var(--bg-hover)';
                  }}
                  onMouseLeave={(e) => {
                    if (activeSessionId !== s.id) e.currentTarget.style.background = 'transparent';
                  }}>
                    <h3 style={{ fontSize: 15, fontWeight: 500, margin: '0 0 6px' }}>{s.name}</h3>
                    <p style={{ fontSize: 12, fontFamily: 'monospace', color: 'var(--text-placeholder)', margin: '0 0 12px' }}>{s.id}</p>
                    <div style={{ display: 'flex', gap: 12, fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Clock size={14} /> {new Date(s.start_time).toLocaleString()}</span>
                      {s.latitude && <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><MapPin size={14} /> {s.latitude.toFixed(2)}, {s.longitude?.toFixed(2)}</span>}
                      {s.enrollment_code && <span style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'var(--accent-primary)', color: '#fff', padding: '2px 8px', borderRadius: 4, fontWeight: 600, fontFamily: 'monospace', letterSpacing: '0.05em' }}>Code: {s.enrollment_code}</span>}
                    </div>
                    {activeSessionId === s.id && (
                      <div className="animate-fade-in" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12, paddingTop: 16, borderTop: '1px solid var(--border-color)' }}>
                        <button className="btn-primary" style={{ padding: '6px 12px', fontSize: 13 }} onClick={(e) => { e.stopPropagation(); generateQR(s.id, true); }}><Play size={14} /> Project</button>
                        <button className="btn-secondary" style={{ padding: '6px 12px', fontSize: 13 }} onClick={(e) => { e.stopPropagation(); setEnrollSessionId(s.id); setEnrollMsg(''); }}><UserPlus size={14} /> Enroll</button>
                        <button className="btn-ghost" style={{ padding: '6px 12px', fontSize: 13 }} onClick={(e) => { e.stopPropagation(); setActiveTab('register'); loadAttendanceRegister(s.id); }}><FileSpreadsheet size={14} /> Register</button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
            {/* QR Projection (Placeholder when not projecting) */}
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}><ScanFace size={16} color="var(--text-secondary)" /> Live Projection</h2>
              <div className="notion-block" style={{ minHeight: 440, display: 'flex', flexDirection: 'column', justifyContent: 'center', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)' }}>
                  <div style={{ textAlign: 'center', color: 'var(--text-placeholder)', padding: 40 }}>
                    <ScanFace size={48} strokeWidth={1} style={{ margin: '0 auto 16px' }} />
                    <p style={{ fontSize: 14 }}>Select a session & click "Project"</p>
                    <p style={{ fontSize: 12, marginTop: 8 }}>This will open a full-screen projection for your class.</p>
                  </div>
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
            </div>

            <div className="notion-block has-border" style={{ marginBottom: 20, padding: 20, background: 'var(--bg-color)' }}>
              <h3 style={{ fontSize: 16, fontWeight: 600, margin: '0 0 6px' }}>Date-wise Attendance Register</h3>
              <p className="text-secondary" style={{ fontSize: 13 }}>
                Roll number + date columns only. Click a roll number to jump to that student in the Students tab.
              </p>
            </div>

            {/* Register table */}
            {registerData ? (
              <div className="animate-fade-in">
                <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
                  {[
                    { label: 'Students', value: registerData.summary.total_students, color: 'var(--text-primary)' },
                    { label: 'Dates', value: registerData.summary.total_dates, color: 'var(--text-primary)' },
                    { label: 'Class', value: selectedRegisterSession?.name || registerData.session_name, color: 'var(--accent-primary)' },
                  ].map((s, i) => (
                    <div key={i} className="notion-block" style={{ flex: 1, minWidth: 140, padding: '22px 18px', textAlign: 'center', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)' }}>
                      <p style={{ fontSize: 32, fontWeight: 700, color: s.color, lineHeight: 1, margin: 0 }}>{s.value}</p>
                      <p className="text-secondary" style={{ fontSize: 13, marginTop: 8, fontWeight: 500 }}>{s.label}</p>
                    </div>
                  ))}
                </div>

                <div className="notion-block has-border" style={{ overflow: 'auto', background: 'var(--bg-color)' }}>
                  <table style={{ width: '100%', minWidth: Math.max(920, 420 + registerData.columns.length * 120), borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                      <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)' }}>
                        <th style={{ ...thStyle, width: 110, minWidth: 110, position: 'sticky', left: 0, zIndex: 4, background: 'var(--bg-secondary)' }}>Roll No.</th>
                        <th style={{ ...thStyle, textAlign: 'left', width: 240, minWidth: 240, position: 'sticky', left: 110, zIndex: 4, background: 'var(--bg-secondary)' }}>Student</th>
                        {registerData.columns.map((column) => (
                          <th key={column.session_id} style={thStyle}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 2, lineHeight: 1.2 }}>
                              <span style={{ fontWeight: 700 }}>
                                {new Date(column.date).toLocaleDateString(undefined, { day: '2-digit', month: 'short' })}
                              </span>
                              <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                                {new Date(column.date).toLocaleDateString(undefined, { weekday: 'short' })}
                              </span>
                            </div>
                          </th>
                        ))}
                        <th style={{ ...thStyle, minWidth: 90 }}>%</th>
                      </tr>
                    </thead>
                    <tbody>
                      {registerData.rows.map((student) => (
                        <tr key={student.student_id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                          <td style={{ ...tdStyle, width: 110, minWidth: 110, position: 'sticky', left: 0, zIndex: 3, background: 'var(--bg-color)', fontWeight: 700 }}>
                            <button
                              className="btn-ghost"
                              style={{ padding: 0, color: 'var(--accent-primary)', fontWeight: 700, minHeight: 'auto' }}
                              onClick={() => jumpToStudentDetails(student.student_id)}
                              title={`Open ${student.full_name} in Students tab`}
                            >
                              {student.roll_no}
                            </button>
                          </td>
                          <td style={{ ...tdStyle, textAlign: 'left', width: 240, minWidth: 240, position: 'sticky', left: 110, zIndex: 2, background: 'var(--bg-color)' }}>
                            {student.full_name}
                          </td>
                          {student.records.map((record) => {
                            const tone = getMatrixStatusTone(record.status);
                            return (
                              <td key={record.session_id} style={{ ...tdStyle, minWidth: 110 }}>
                                <span style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  minWidth: 72,
                                  borderRadius: 999,
                                  padding: '4px 10px',
                                  fontSize: 11,
                                  fontWeight: 700,
                                  background: tone.background,
                                  color: tone.text,
                                }}>
                                  {tone.label}
                                </span>
                              </td>
                            );
                          })}
                          <td style={{ ...tdStyle, fontWeight: 700 }}>
                            {student.attendance_rate}%
                            <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>
                              {student.total_attended}/{student.total_classes}
                            </div>
                          </td>
                        </tr>
                      ))}
                      {registerData.rows.length === 0 && (
                        <tr>
                          <td colSpan={registerData.columns.length + 3} style={{ ...tdStyle, textAlign: 'center', color: 'var(--text-placeholder)', padding: 32 }}>
                            No students enrolled in this session.
                          </td>
                        </tr>
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

        {/* ═══ STUDENTS TAB ═══ */}
        {activeTab === 'students' && (
          <div className="animate-fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ fontSize: 16, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}><Users size={16} color="var(--text-secondary)" /> Session Students</h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                <p className="text-secondary" style={{ fontSize: 13 }}>{studentsData?.total_enrolled || 0} students in selected class</p>
                {selectedStudentsSession && (
                  <span className="text-secondary" style={{ fontSize: 12 }}>
                    {selectedStudentsSession.name} • {new Date(selectedStudentsSession.start_time).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                )}
                <span className="status-pill success">Admin-only editing</span>
              </div>
            </div>

            {studentMessage && (
              <div className="alert animate-fade-in" style={{ marginBottom: 16, background: 'var(--success-bg)', color: 'var(--success)', border: '1px solid rgba(15, 123, 108, 0.2)' }}>
                {studentMessage}
              </div>
            )}

            <div style={{ display: 'flex', gap: 12, marginBottom: 20, alignItems: 'end', flexWrap: 'wrap' }}>
              <div className="form-group" style={{ flex: 1, minWidth: 220, marginBottom: 0 }}>
                <label style={{ fontSize: 13 }}>Select Session</label>
                <select className="input-base" value={studentsSessionId} onChange={e => { if (e.target.value) loadStudentsForSession(e.target.value); }}>
                  <option value="">Choose a session…</option>
                  {sessions.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              {studentsSessionId && (
                <button className="btn-ghost" style={{ fontSize: 12 }} onClick={() => loadStudentsForSession(studentsSessionId)}>
                  <RefreshCw size={13} /> Refresh
                </button>
              )}
            </div>

            <div className="notion-block has-border" style={{ background: 'var(--bg-color)' }}>
              {studentsData ? (
                studentsData.register.length > 0 ? (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', minWidth: 980, borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                      <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)' }}>
                        <th style={thStyle}>#</th>
                        <th style={{ ...thStyle, textAlign: 'left' }}>Roll No</th>
                        <th style={{ ...thStyle, textAlign: 'left' }}>Student</th>
                        <th style={{ ...thStyle, textAlign: 'left' }}>Email</th>
                        <th style={{ ...thStyle, textAlign: 'left' }}>Class</th>
                        <th style={thStyle}>Device ID</th>
                        <th style={thStyle}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {studentsData.register.map((s, index) => {
                        const isHighlighted = highlightStudentId === s.student_id;
                        return (
                          <tr
                            key={s.student_id}
                            id={`student-${s.student_id}`}
                            style={{
                              borderBottom: '1px solid var(--border-color)',
                              background: isHighlighted ? 'rgba(46, 170, 220, 0.08)' : 'transparent',
                            }}
                          >
                            <td style={tdStyle}>{index + 1}</td>
                            <td style={{ ...tdStyle, textAlign: 'left', fontWeight: 700, color: 'var(--accent-primary)' }}>{s.roll_no}</td>
                            <td style={{ ...tdStyle, textAlign: 'left' }}>
                              <div style={{ fontWeight: 600 }}>{s.full_name}</div>
                            </td>
                            <td style={{ ...tdStyle, textAlign: 'left', fontFamily: 'monospace', fontSize: 12 }}>{s.email}</td>
                            <td style={{ ...tdStyle, textAlign: 'left' }}>
                              {selectedStudentsSession?.name || studentsData.session_name}
                            </td>
                            <td style={{ ...tdStyle, fontFamily: 'monospace', fontSize: 11, maxWidth: 160, wordBreak: 'break-all' }}>{s.device_id}</td>
                            <td style={tdStyle}>
                              <button className="btn-ghost" style={{ padding: '6px 10px', fontSize: 12 }} onClick={() => openStudentEditor({
                                student_id: s.student_id,
                                full_name: s.full_name,
                                roll_no: s.roll_no,
                                email: s.email,
                                device_id: s.device_id,
                              })}>
                                Edit
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                      {studentsData.register.length === 0 && (
                        <tr><td colSpan={7} style={{ ...tdStyle, textAlign: 'center', color: 'var(--text-placeholder)', padding: 32 }}>No students enrolled in this session.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
                ) : (
                  <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-placeholder)' }}>
                    <Users size={32} style={{ margin: '0 auto 12px' }} />
                    <p>No students enrolled in this session.</p>
                  </div>
                )
              ) : (
                <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-placeholder)' }}>
                  <Users size={32} style={{ margin: '0 auto 12px' }} />
                  <p>Select a session to view its students.</p>
                </div>
              )}
            </div>
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
        </>
        )}
      </div>

      {/* ═══ CREATE SESSION MODAL ═══ */}
      {showCreate && (
        <div style={modalOverlay}>
          <div className="notion-block has-border animate-fade-in" style={{ ...modalBox, maxWidth: 440 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h2 style={{ fontSize: 20, fontWeight: 600 }}>New Session</h2>
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
              <div className="form-group"><label>Student Emails (comma or newline separated)</label><textarea className="input-base" style={{ minHeight: '100px', resize: 'vertical' }} placeholder="student@institution.edu&#10;another@institution.edu" value={enrollEmails} onChange={e => setEnrollEmails(e.target.value)} required /></div>
              <button type="submit" className="btn-primary" style={{ width: '100%', padding: '10px' }} disabled={enrolling}>{enrolling ? 'Enrolling…' : 'Enroll Students'}</button>
            </form>
          </div>
        </div>
      )}

      {editingStudent && (
        <div style={modalOverlay}>
          <div className="notion-block has-border animate-fade-in" style={{ ...modalBox, maxWidth: 440 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <div>
                <h2 style={{ fontSize: 18, margin: 0 }}>Edit Student</h2>
                <p className="text-secondary" style={{ fontSize: 12, marginTop: 4 }}>
                  Only admin/teacher users can change student data.
                </p>
              </div>
              <button className="btn-ghost" onClick={closeStudentEditor}><X size={18} /></button>
            </div>
            <form onSubmit={handleStudentUpdate}>
              <div className="form-group">
                <label>Roll Number</label>
                <input
                  className="input-base"
                  value={editForm.roll_no}
                  onChange={(e) => setEditForm((current) => ({ ...current, roll_no: e.target.value }))}
                  placeholder="e.g. 4036/23"
                  pattern="[A-Za-z0-9][A-Za-z0-9/\-]{0,49}"
                  title="Use letters, numbers, '/' or '-' only."
                />
              </div>
              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  className="input-base"
                  value={editForm.email}
                  onChange={(e) => setEditForm((current) => ({ ...current, email: e.target.value }))}
                  required
                />
              </div>
              <div className="form-group">
                <label>Device ID</label>
                <input
                  className="input-base"
                  value={editForm.device_id}
                  onChange={(e) => setEditForm((current) => ({ ...current, device_id: e.target.value }))}
                  placeholder="Leave blank to unbind the device"
                />
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button type="button" className="btn-ghost" onClick={closeStudentEditor}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={savingStudent}>
                  {savingStudent ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══ FULL-SCREEN PROJECTION MODAL ═══ */}
      {qrPayload && activeSessionId && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'var(--bg-secondary)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <button className="btn-ghost" style={{ position: 'absolute', top: 24, right: 24, fontSize: 14 }} onClick={() => { setQrPayload(null); setActiveSessionId(null); }}>
            <X size={20} /> Close Projection
          </button>
          
          <div className="animate-fade-in" style={{ textAlign: 'center', padding: 24, maxWidth: 800, width: '100%' }}>
            {/* Massive Session Title */}
            <h1 style={{ fontSize: '3rem', fontWeight: 800, marginBottom: 40, letterSpacing: '-0.03em' }}>
              {sessions.find(s => s.id === activeSessionId)?.name || "Live Session"}
            </h1>

            {/* Large Countdown Timer for Students */}
            {timeLeft !== null && (
              <div style={{ marginBottom: 40 }}>
                <div style={{
                  display: 'inline-block',
                  padding: '16px 40px',
                  background: timeLeft > 0 ? (timeLeft <= 60 ? 'var(--error-bg)' : 'var(--bg-color)') : 'var(--error-bg)',
                  border: `2px solid ${timeLeft > 0 ? (timeLeft <= 60 ? 'var(--error)' : 'var(--border-color)') : 'var(--error)'}`,
                  borderRadius: 'var(--radius-lg)',
                  boxShadow: 'var(--shadow-md)',
                }}>
                  <p style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {timeLeft > 0 ? 'Scanning Window Closes In' : 'Attendance Closed'}
                  </p>
                  <p style={{ 
                    fontSize: 72, 
                    fontWeight: 800, 
                    fontFamily: 'monospace',
                    color: timeLeft > 0 ? (timeLeft <= 60 ? 'var(--error)' : 'var(--text-primary)') : 'var(--error)',
                    lineHeight: 1,
                    margin: 0
                  }}>
                    {timeLeft > 0 ? formatTime(timeLeft) : '0:00'}
                  </p>
                </div>
              </div>
            )}

            <div style={{ background: '#fff', padding: 32, borderRadius: 24, display: 'inline-block', boxShadow: 'var(--shadow-md)', border: '1px solid var(--border-color)' }}>
              <QRCodeSVG value={JSON.stringify(qrPayload)} size={380} level="H" bgColor="#fff" fgColor="#37352f" />
            </div>
            
            <div style={{ marginTop: 40 }}>
              <p style={{ letterSpacing: '0.08em', fontSize: 20, fontWeight: 700, color: 'var(--text-primary)' }}>SCAN WITH QUICKSCAN APP</p>
              <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginTop: 12 }}>
                <p className="text-secondary" style={{ fontSize: 16, fontFamily: 'monospace', background: 'var(--bg-color)', padding: '4px 12px', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)' }}>Token: {qrPayload.timestamp}</p>
                <p style={{ fontSize: 16, fontFamily: 'monospace', background: 'var(--accent-primary)', color: '#fff', fontWeight: 600, padding: '4px 12px', borderRadius: 'var(--radius-sm)' }}>Code: {sessions.find(s => s.id === activeSessionId)?.enrollment_code}</p>
              </div>
              
              {qrPayload.class_lat && (
                <div className="status-pill success" style={{ marginTop: 16, fontSize: 14, padding: '6px 16px' }}>
                  <ShieldCheck size={16} /> Geofence Active
                </div>
              )}
            </div>
            
            <button className="btn-ghost" style={{ marginTop: 40, fontSize: 16, color: 'var(--text-secondary)' }} onClick={() => generateQR(activeSessionId, true)}>
              <RefreshCw size={16} /> Restart 5-Min Timer
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Helpers ──
function StatCard({ label, value, icon, color }: { label: string; value: number | string; icon: React.ReactNode; color?: string }) {
  return (
    <div className="notion-block" style={{ padding: '24px 16px', textAlign: 'center', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)' }}>
      <div style={{ color: color || 'var(--text-secondary)', margin: '0 auto 12px' }}>{icon}</div>
      <p style={{ fontSize: 28, fontWeight: 700, lineHeight: 1, color: color || 'var(--text-primary)' }}>{value}</p>
      <p className="text-secondary" style={{ fontSize: 13, marginTop: 8, fontWeight: 500 }}>{label}</p>
    </div>
  );
}

function getMatrixStatusTone(status: string | null) {
  if (status === 'Present') {
    return {
      label: 'Present',
      background: 'rgba(15, 123, 108, 0.08)',
      text: 'var(--success)',
    };
  }
  if (status === 'Leave') {
    return {
      label: 'Leave',
      background: 'rgba(214, 162, 32, 0.12)',
      text: '#8a6b00',
    };
  }
  if (status === 'Absent') {
    return {
      label: 'Absent',
      background: 'rgba(224, 62, 62, 0.08)',
      text: 'var(--error)',
    };
  }
  return {
    label: '—',
    background: 'rgba(55, 53, 47, 0.06)',
    text: 'var(--text-secondary)',
  };
}

const thStyle: React.CSSProperties = { padding: '10px 12px', fontWeight: 600, fontSize: 12, textAlign: 'center', whiteSpace: 'nowrap' };
const tdStyle: React.CSSProperties = { padding: '10px 12px', textAlign: 'center', whiteSpace: 'nowrap' };
const modalOverlay: React.CSSProperties = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 24 };
const modalBox: React.CSSProperties = { width: '100%', padding: 32, background: 'var(--bg-color)' };
