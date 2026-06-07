import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import useAuthStore from '../stores/authStore';
import useAppStore from '../stores/appStore';
import {
  getConnectionsByStudent, getAllTeachers, createConnection,
  checkExistingConnection, getAnnouncementsForStudent, getQuizzesByTeacherIds
} from '../services/firestore';
import { PageLayout } from '../components/layout';
import { Spinner } from '../components/ui';

const DEPT_COLORS = { CSE:'#534AB7', ISE:'#1D9E75', ECE:'#f97316', EEE:'#eab308', ME:'#ef4444', CE:'#8b5cf6', AIML:'#06b6d4', DS:'#ec4899', Other:'#6b7280' };

function TeacherAvatar({ name, dept, size=44 }) {
  const color = DEPT_COLORS[dept] || '#534AB7';
  return (
    <div style={{ width:size, height:size, borderRadius:12, flexShrink:0, background:`${color}22`, border:`2px solid ${color}`, display:'flex', alignItems:'center', justifyContent:'center', color, fontWeight:800, fontSize:size*0.38, fontFamily:'Syne' }}>
      {(name||'?')[0].toUpperCase()}
    </div>
  );
}

export default function MyTeachers() {
  const [searchParams] = useSearchParams();
  const autoConnectTid = searchParams.get('connectTeacher');
  const autoConnectName = searchParams.get('tname');

  const { user, profile } = useAuthStore();
  const { toast } = useAppStore();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('connected');
  const [connections, setConnections] = useState([]);
  const [allTeachers, setAllTeachers] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [teacherCode, setTeacherCode] = useState('');
  const [connecting, setConnecting] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => { loadAll(); }, [user]);

  // Auto-connect from invite link
  useEffect(() => {
    if (autoConnectTid && connections.length >= 0 && !loading) {
      handleConnectById(autoConnectTid, decodeURIComponent(autoConnectName||''));
    }
  }, [autoConnectTid, loading]);

  const loadAll = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [conns, teachers] = await Promise.all([
        getConnectionsByStudent(user.uid),
        getAllTeachers(),
      ]);
      setConnections(conns);
      setAllTeachers(teachers);

      const acceptedTeacherIds = conns.filter(c=>c.status==='accepted').map(c=>c.teacherId);
      if (acceptedTeacherIds.length) {
        const [ann, qzs] = await Promise.all([
          getAnnouncementsForStudent(acceptedTeacherIds),
          getQuizzesByTeacherIds(acceptedTeacherIds),
        ]);
        setAnnouncements(ann);
        setQuizzes(qzs.filter(q=>q.status==='published'));
      }
    } catch { toast('Failed to load', 'error'); }
    setLoading(false);
  };

  const handleConnectById = async (teacherId, teacherName) => {
    try {
      const existing = await checkExistingConnection(user.uid, teacherId);
      if (existing) { toast(`Already ${existing.status} with ${teacherName||'this teacher'}`, 'info'); return; }
      const teacher = allTeachers.find(t=>t.id===teacherId) || { name:teacherName, department:'' };
      await createConnection({
        studentId:user.uid, studentName:profile.name, studentEmail:user.email,
        studentUSN:profile.usn||'', studentDept:profile.department||'', studentBatch:profile.batch||'', studentYear:profile.academicYear||'',
        teacherId, teacherName:teacher.name||teacherName, teacherDept:teacher.department||'', teacherCode:teacher.teacherCode||'',
        status:'pending',
      });
      toast(`Connection request sent to ${teacher.name||teacherName}! ✓`, 'success');
      await loadAll();
    } catch { toast('Failed to send request', 'error'); }
  };

  const handleConnectByCode = async () => {
    if (!teacherCode.trim()) return;
    setConnecting(true);
    try {
      const teacher = allTeachers.find(t=>t.teacherCode===teacherCode.trim().toUpperCase());
      if (!teacher) { toast('Teacher code not found', 'error'); setConnecting(false); return; }
      await handleConnectById(teacher.id, teacher.name);
      setTeacherCode('');
    } catch { toast('Failed', 'error'); }
    setConnecting(false);
  };

  const connectedTeachers = connections
    .filter(c=>c.status==='accepted')
    .map(c=>({ ...c, teacher:allTeachers.find(t=>t.id===c.teacherId)||{} }));
  const pendingConns = connections.filter(c=>c.status==='pending');

  const unconnectedTeachers = allTeachers.filter(t=>{
    const conn = connections.find(c=>c.teacherId===t.id);
    return !conn || conn.status==='rejected';
  }).filter(t=>!search || t.name?.toLowerCase().includes(search.toLowerCase()) || t.department?.toLowerCase().includes(search.toLowerCase()));

  return (
    <PageLayout title="My Teachers" role="student">
      <div style={{ maxWidth:600, margin:'0 auto' }}>

        {/* Tab bar */}
        <div style={{ display:'flex', gap:6, marginBottom:16, background:'var(--card)', borderRadius:12, padding:4 }}>
          {[['connected',`👨‍🏫 Connected (${connectedTeachers.length})`],['find','🔍 Find Teachers'],['announcements',`📢 (${announcements.length})`]].map(([k,l])=>(
            <button key={k} onClick={()=>setActiveTab(k)} style={{ flex:1, padding:'9px 4px', borderRadius:9, fontSize:11, fontFamily:'Syne', fontWeight:700, border:'none', cursor:'pointer', transition:'all 0.15s', background:activeTab===k?'var(--primary)':'transparent', color:activeTab===k?'white':'var(--muted)' }}>{l}</button>
          ))}
        </div>

        {loading ? <div style={{ display:'flex', justifyContent:'center', padding:48 }}><Spinner size={32} /></div> : (<>

        {/* ── CONNECTED TAB ── */}
        {activeTab==='connected' && (
          <div>
            {/* Connect by code */}
            <div className="card" style={{ padding:16, marginBottom:14 }}>
              <p style={{ fontWeight:700, fontSize:13, marginBottom:10 }}>Enter Teacher Code to Connect</p>
              <div style={{ display:'flex', gap:8 }}>
                <input className="input" style={{ flex:1 }} value={teacherCode} onChange={e=>setTeacherCode(e.target.value.toUpperCase())} placeholder="e.g. TC1A2B3C" maxLength={10} />
                <button onClick={handleConnectByCode} disabled={connecting||!teacherCode.trim()} className="btn-primary" style={{ padding:'10px 16px', fontSize:13 }}>
                  {connecting?<Spinner size={14} color="white"/>:'Connect'}
                </button>
              </div>
            </div>

            {/* Pending */}
            {pendingConns.length > 0 && (
              <div style={{ marginBottom:14 }}>
                <p style={{ fontWeight:700, fontSize:12, color:'var(--muted)', marginBottom:8 }}>PENDING REQUESTS</p>
                {pendingConns.map(c=>(
                  <div key={c.id} className="card" style={{ padding:12, marginBottom:8, borderLeft:'4px solid #f97316' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                      <TeacherAvatar name={c.teacherName} dept={c.teacherDept} />
                      <div>
                        <div style={{ fontWeight:700, fontSize:14 }}>{c.teacherName}</div>
                        <div style={{ fontSize:12, color:'var(--muted)' }}>{c.teacherDept}</div>
                      </div>
                      <span style={{ marginLeft:'auto', fontSize:10, fontWeight:700, background:'rgba(249,115,22,0.1)', color:'#f97316', borderRadius:4, padding:'2px 8px' }}>PENDING</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Connected teachers */}
            {connectedTeachers.length===0 ? (
              <div className="card" style={{ padding:40, textAlign:'center' }}>
                <div style={{ fontSize:44 }}>👨‍🏫</div>
                <p style={{ fontWeight:700, marginTop:10 }}>No connected teachers</p>
                <p style={{ fontSize:13, color:'var(--muted)', marginTop:4 }}>Enter a teacher code above or find teachers in the Find tab.</p>
              </div>
            ) : connectedTeachers.map(c=>{
              const teacherQuizzes = quizzes.filter(q=>q.creatorId===c.teacherId);
              return (
                <div key={c.id} className="card" style={{ padding:16, marginBottom:10, borderLeft:'4px solid var(--teal)' }}>
                  <div style={{ display:'flex', gap:12, alignItems:'flex-start' }}>
                    <TeacherAvatar name={c.teacherName} dept={c.teacherDept} size={48} />
                    <div style={{ flex:1 }}>
                      <div style={{ fontWeight:800, fontSize:15, fontFamily:'Syne' }}>{c.teacherName}</div>
                      <div style={{ fontSize:12, color:'var(--muted)' }}>Dept: {c.teacherDept||'—'}</div>
                      <div style={{ display:'flex', gap:10, marginTop:8, flexWrap:'wrap' }}>
                        <span style={{ fontSize:11, background:'rgba(83,74,183,0.1)', color:'var(--primary)', borderRadius:6, padding:'3px 9px', fontWeight:600 }}>
                          📝 {teacherQuizzes.length} active quiz{teacherQuizzes.length!==1?'zes':''}
                        </span>
                        <span style={{ fontSize:11, background:'rgba(29,158,117,0.1)', color:'var(--teal)', borderRadius:6, padding:'3px 9px', fontWeight:600 }}>
                          ✓ Connected
                        </span>
                      </div>
                      {teacherQuizzes.length>0 && (
                        <div style={{ marginTop:10 }}>
                          <p style={{ fontSize:11, color:'var(--muted)', marginBottom:6 }}>Active Quizzes:</p>
                          {teacherQuizzes.slice(0,3).map(q=>(
                            <div key={q.id} onClick={()=>navigate(`/attempt/${q.id}`)} style={{ display:'flex', alignItems:'center', gap:8, padding:'7px 10px', background:'var(--surface)', borderRadius:8, marginBottom:5, cursor:'pointer' }}>
                              <span style={{ fontSize:12, flex:1 }}>{q.title}</span>
                              <span style={{ fontSize:10, color:'var(--primary)', fontWeight:700 }}>Take →</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── FIND TEACHERS TAB ── */}
        {activeTab==='find' && (
          <div>
            <input className="input" style={{ width:'100%', marginBottom:12 }} placeholder="🔍 Search teachers by name or department..." value={search} onChange={e=>setSearch(e.target.value)} />
            {unconnectedTeachers.length===0 ? (
              <div className="card" style={{ padding:40, textAlign:'center' }}>
                <div style={{ fontSize:44 }}>🔍</div>
                <p style={{ fontWeight:700, marginTop:10 }}>No teachers found</p>
              </div>
            ) : unconnectedTeachers.map(t=>{
              const conn = connections.find(c=>c.teacherId===t.id);
              return (
                <div key={t.id} className="card" style={{ padding:14, marginBottom:10 }}>
                  <div style={{ display:'flex', gap:12, alignItems:'center' }}>
                    <TeacherAvatar name={t.name} dept={t.department} />
                    <div style={{ flex:1 }}>
                      <div style={{ fontWeight:700, fontSize:14, fontFamily:'Syne' }}>{t.name}</div>
                      <div style={{ fontSize:12, color:'var(--muted)' }}>{t.department}</div>
                    </div>
                    <button
                      onClick={()=>handleConnectById(t.id, t.name)}
                      className="btn-primary"
                      style={{ padding:'7px 14px', fontSize:12 }}
                    >
                      + Connect
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── ANNOUNCEMENTS TAB ── */}
        {activeTab==='announcements' && (
          <div>
            {announcements.length===0 ? (
              <div className="card" style={{ padding:40, textAlign:'center' }}>
                <div style={{ fontSize:44 }}>📢</div>
                <p style={{ fontWeight:700, marginTop:10 }}>No announcements</p>
                <p style={{ fontSize:13, color:'var(--muted)', marginTop:4 }}>Announcements from your connected teachers will appear here.</p>
              </div>
            ) : announcements.map(a=>(
              <div key={a.id} className="card" style={{ padding:14, marginBottom:10, borderLeft:'4px solid var(--primary)' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:6 }}>
                  <span style={{ fontWeight:700, fontSize:13 }}>{a.teacherName}</span>
                  <span style={{ fontSize:10, color:'var(--muted)' }}>{a.createdAt?.toDate?.()?.toLocaleDateString()||'Recently'}</span>
                </div>
                <p style={{ fontSize:13, color:'var(--text-secondary)', lineHeight:1.6, margin:0 }}>{a.message}</p>
              </div>
            ))}
          </div>
        )}

        </>)}
        <div style={{ height:24 }} />
      </div>
    </PageLayout>
  );
}
