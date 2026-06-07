import { useState, useEffect } from 'react';
import useAuthStore from '../stores/authStore';
import useAppStore from '../stores/appStore';
import {
  getConnectionsByTeacher, getAttemptsByStudent,
  updateConnection, createAnnouncement, getAnnouncementsByTeacher,
  getAllStudents
} from '../services/firestore';
import { PageLayout } from '../components/layout';
import { Spinner } from '../components/ui';
import { getGrade, getGradeColor } from '../utils';

const DEPT_COLORS = { CSE:'#534AB7', ISE:'#1D9E75', ECE:'#f97316', EEE:'#eab308', ME:'#ef4444', CE:'#8b5cf6', AIML:'#06b6d4', DS:'#ec4899', Other:'#6b7280' };

function Avatar({ name, size=40, dept }) {
  const color = DEPT_COLORS[dept] || '#534AB7';
  return (
    <div style={{ width:size, height:size, borderRadius:'50%', flexShrink:0, background:`${color}22`, border:`2px solid ${color}`, display:'flex', alignItems:'center', justifyContent:'center', color, fontWeight:800, fontSize:size*0.38, fontFamily:'Syne' }}>
      {(name||'?')[0].toUpperCase()}
    </div>
  );
}

function StudentDetailSheet({ connection, onClose }) {
  const [attempts, setAttempts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAttemptsByStudent(connection.studentId)
      .then(a => setAttempts(a.sort((x,y)=>(y.submittedAt?.seconds||0)-(x.submittedAt?.seconds||0))))
      .finally(()=>setLoading(false));
  }, [connection.studentId]);

  const avgPct = attempts.length ? Math.round(attempts.reduce((s,a)=>s+(a.percentage||0),0)/attempts.length) : 0;
  const totalPts = Math.round(attempts.reduce((s,a)=>s+(a.score||0),0));
  const best = attempts.length ? Math.max(...attempts.map(a=>a.percentage||0)) : 0;

  // Subject-wise breakdown
  const bySubject = {};
  attempts.forEach(a => {
    const sub = a.quizTitle?.split('-')[0]?.trim() || 'General';
    if (!bySubject[sub]) bySubject[sub] = { total:0, count:0 };
    bySubject[sub].total += (a.percentage||0);
    bySubject[sub].count++;
  });

  return (
    <div style={{ position:'fixed', inset:0, zIndex:60, background:'rgba(0,0,0,0.55)', display:'flex', alignItems:'flex-end' }} onClick={onClose}>
      <div style={{ width:'100%', maxHeight:'88vh', overflowY:'auto', background:'var(--card)', borderRadius:'20px 20px 0 0', padding:20 }} onClick={e=>e.stopPropagation()}>
        {/* Header */}
        <div style={{ display:'flex', gap:14, alignItems:'center', marginBottom:16 }}>
          <Avatar name={connection.studentName} size={52} dept={connection.studentDept} />
          <div style={{ flex:1 }}>
            <div style={{ fontWeight:800, fontSize:17, fontFamily:'Syne' }}>{connection.studentName}</div>
            <div style={{ fontSize:12, color:'var(--muted)' }}>{connection.studentUSN} · {connection.studentDept}</div>
            <div style={{ fontSize:12, color:'var(--muted)' }}>{connection.studentBatch} · {connection.studentYear}</div>
          </div>
          <button onClick={onClose} style={{ background:'none', border:'none', fontSize:22, cursor:'pointer', color:'var(--muted)' }}>✕</button>
        </div>

        {/* Stats */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8, marginBottom:16 }}>
          {[
            { label:'Quizzes', value:attempts.length, icon:'📝' },
            { label:'Avg Score', value:`${avgPct}%`, icon:'📊', color:getGradeColor(avgPct) },
            { label:'Best', value:`${Math.round(best)}%`, icon:'🏆', color:getGradeColor(best) },
            { label:'Points', value:totalPts, icon:'⭐' },
          ].map(s=>(
            <div key={s.label} className="card" style={{ padding:'10px 8px', textAlign:'center' }}>
              <div style={{ fontSize:18 }}>{s.icon}</div>
              <div style={{ fontWeight:800, fontSize:15, fontFamily:'Syne', color:s.color||'var(--primary)' }}>{s.value}</div>
              <div style={{ fontSize:10, color:'var(--muted)' }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Subject-wise */}
        {Object.keys(bySubject).length > 0 && (
          <div style={{ marginBottom:16 }}>
            <p style={{ fontWeight:700, fontSize:13, marginBottom:8 }}>Subject-wise Performance</p>
            {Object.entries(bySubject).map(([sub, data])=>{
              const pct = Math.round(data.total/data.count);
              return (
                <div key={sub} style={{ display:'flex', alignItems:'center', gap:10, marginBottom:8 }}>
                  <span style={{ fontSize:12, width:80, color:'var(--text-secondary)', flexShrink:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{sub}</span>
                  <div style={{ flex:1, height:8, background:'var(--border)', borderRadius:4, overflow:'hidden' }}>
                    <div style={{ width:`${pct}%`, height:'100%', background:getGradeColor(pct), borderRadius:4, transition:'width 0.5s' }} />
                  </div>
                  <span style={{ fontSize:12, fontWeight:700, color:getGradeColor(pct), width:36, textAlign:'right' }}>{pct}%</span>
                </div>
              );
            })}
          </div>
        )}

        {/* AI Insights */}
        {attempts.length > 0 && (
          <div style={{ padding:12, background:'rgba(83,74,183,0.07)', borderRadius:12, marginBottom:16 }}>
            <p style={{ fontWeight:700, fontSize:13, marginBottom:8 }}>🤖 AI Insights</p>
            <ul style={{ margin:0, padding:'0 0 0 16px', fontSize:12, color:'var(--text-secondary)', lineHeight:2 }}>
              {avgPct >= 80 && <li>🟢 <strong>High performer</strong> — consistently scoring above 80%</li>}
              {avgPct >= 60 && avgPct < 80 && <li>🟡 <strong>Average performer</strong> — room for improvement</li>}
              {avgPct < 60 && <li>🔴 <strong>Needs attention</strong> — scoring below 60%, consider extra support</li>}
              {attempts.length >= 5 && <li>✅ <strong>Active learner</strong> — completed {attempts.length} quizzes</li>}
              {attempts.length < 3 && <li>⚠️ <strong>Low engagement</strong> — only {attempts.length} attempt(s) so far</li>}
              {best - avgPct > 20 && <li>📈 <strong>Inconsistent</strong> — high variance between best ({Math.round(best)}%) and average ({avgPct}%)</li>}
            </ul>
          </div>
        )}

        {/* Quiz history */}
        <p style={{ fontWeight:700, fontSize:13, marginBottom:10 }}>Quiz History</p>
        {loading ? <div style={{ textAlign:'center', padding:20 }}><Spinner /></div> :
         attempts.length === 0 ? <p style={{ color:'var(--muted)', fontSize:13, textAlign:'center', padding:16 }}>No attempts yet</p> :
         <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
           {attempts.slice(0,10).map(a=>(
             <div key={a.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 14px', background:'var(--surface)', borderRadius:10 }}>
               <div style={{ flex:1, minWidth:0 }}>
                 <div style={{ fontWeight:600, fontSize:13, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{a.quizTitle||'Untitled'}</div>
                 <div style={{ fontSize:11, color:'var(--muted)' }}>{a.score}/{a.maxScore} pts</div>
               </div>
               <div style={{ fontWeight:800, fontSize:15, fontFamily:'Syne', color:getGradeColor(a.percentage||0) }}>{Math.round(a.percentage||0)}%</div>
               <div style={{ width:30, height:30, borderRadius:8, background:getGradeColor(a.percentage||0)+'22', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:800, fontSize:12, color:getGradeColor(a.percentage||0) }}>{getGrade(a.percentage||0)}</div>
             </div>
           ))}
         </div>
        }
        <div style={{ height:16 }} />
      </div>
    </div>
  );
}

function AnnouncementModal({ connection, onClose }) {
  const { user, profile } = useAuthStore();
  const { toast } = useAppStore();
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);

  const send = async () => {
    if (!text.trim()) return;
    setSending(true);
    try {
      await createAnnouncement({
        teacherId: user.uid, teacherName: profile.name,
        targetStudentId: connection ? connection.studentId : null,
        targetAll: !connection,
        message: text.trim(),
        title: connection ? `Message to ${connection.studentName}` : 'Announcement to All Students',
      });
      toast('Announcement sent ✓', 'success');
      onClose();
    } catch { toast('Failed to send', 'error'); }
    setSending(false);
  };

  return (
    <div style={{ position:'fixed', inset:0, zIndex:60, background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center', padding:20 }} onClick={onClose}>
      <div style={{ background:'var(--card)', borderRadius:16, padding:24, width:'100%', maxWidth:440 }} onClick={e=>e.stopPropagation()}>
        <h3 style={{ margin:'0 0 16px', fontFamily:'Syne' }}>📢 {connection ? `Message to ${connection.studentName}` : 'Announce to All'}</h3>
        <textarea className="input" rows={4} value={text} onChange={e=>setText(e.target.value)} placeholder="Write your announcement or message..." style={{ resize:'vertical', marginBottom:14 }} />
        <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={send} disabled={sending || !text.trim()}>
            {sending ? <Spinner size={14} color="white" /> : '📢 Send'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function StudentsConnected() {
  const { user, profile } = useAuthStore();
  const { toast } = useAppStore();
  const [connections, setConnections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('accepted');
  const [batchFilter, setBatchFilter] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [yearFilter, setYearFilter] = useState('');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [announcing, setAnnouncing] = useState(null); // null=closed, false=to all, connection=to one
  const [activeTab, setActiveTab] = useState('students'); // students | invite | announcements
  const [announcements, setAnnouncements] = useState([]);
  const [copied, setCopied] = useState(false);

  const teacherCode = profile?.teacherCode || '';
  const inviteLink = `${window.location.origin}/signup?tid=${user?.uid}&tname=${encodeURIComponent(profile?.name||'')}`;

  useEffect(() => { loadAll(); }, [user]);

  const loadAll = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [conns, ann] = await Promise.all([
        getConnectionsByTeacher(user.uid),
        getAnnouncementsByTeacher(user.uid),
      ]);
      // Enrich accepted students with stats
      const enriched = await Promise.all(conns.map(async c => {
        if (c.status !== 'accepted') return c;
        try {
          const attempts = await getAttemptsByStudent(c.studentId);
          const avgPct = attempts.length ? Math.round(attempts.reduce((s,a)=>s+(a.percentage||0),0)/attempts.length) : 0;
          return { ...c, stats: { attempts:attempts.length, avgPct, totalPoints:Math.round(attempts.reduce((s,a)=>s+(a.score||0),0)) } };
        } catch { return c; }
      }));
      setConnections(enriched);
      setAnnouncements(ann);
    } catch { toast('Failed to load', 'error'); }
    setLoading(false);
  };

  const accept = async (id) => {
    await updateConnection(id, { status:'accepted' });
    toast('Student accepted ✓', 'success');
    setConnections(prev=>prev.map(c=>c.id===id?{...c,status:'accepted'}:c));
  };
  const reject = async (id) => {
    await updateConnection(id, { status:'rejected' });
    toast('Request rejected', 'success');
    setConnections(prev=>prev.map(c=>c.id===id?{...c,status:'rejected'}:c));
  };

  const copyLink = () => { navigator.clipboard.writeText(inviteLink); setCopied(true); setTimeout(()=>setCopied(false),2000); };
  const copyCode = () => { navigator.clipboard.writeText(teacherCode); setCopied(true); setTimeout(()=>setCopied(false),2000); };

  const accepted = connections.filter(c=>c.status==='accepted');
  const pending = connections.filter(c=>c.status==='pending');

  const batches = [...new Set(accepted.map(c=>c.studentBatch).filter(Boolean))];
  const depts = [...new Set(accepted.map(c=>c.studentDept).filter(Boolean))];
  const years = [...new Set(accepted.map(c=>c.studentYear).filter(Boolean))];

  const filtered = connections.filter(c => {
    if (filter !== 'all' && c.status !== filter) return false;
    if (search && !c.studentName?.toLowerCase().includes(search.toLowerCase()) && !c.studentUSN?.toLowerCase().includes(search.toLowerCase())) return false;
    if (batchFilter && c.studentBatch !== batchFilter) return false;
    if (deptFilter && c.studentDept !== deptFilter) return false;
    if (yearFilter && c.studentYear !== yearFilter) return false;
    return true;
  });

  const avgScore = accepted.filter(c=>c.stats).length
    ? Math.round(accepted.filter(c=>c.stats).reduce((s,c)=>s+c.stats.avgPct,0)/accepted.filter(c=>c.stats).length) : 0;

  return (
    <PageLayout title="My Students" role="teacher">
      <div style={{ maxWidth:640, margin:'0 auto' }}>

        {/* Tab bar */}
        <div style={{ display:'flex', gap:6, marginBottom:16, background:'var(--card)', borderRadius:12, padding:4 }}>
          {[['students','👨‍🎓 Students'],['invite','🔗 Invite'],['announcements','📢 Announce']].map(([k,l])=>(
            <button key={k} onClick={()=>setActiveTab(k)} style={{
              flex:1, padding:'9px 4px', borderRadius:9, fontSize:12, fontFamily:'Syne', fontWeight:700, border:'none', cursor:'pointer', transition:'all 0.15s',
              background:activeTab===k?'var(--primary)':'transparent', color:activeTab===k?'white':'var(--muted)'
            }}>{l}</button>
          ))}
        </div>

        {/* ── STUDENTS TAB ── */}
        {activeTab==='students' && (
          <>
            {/* Summary */}
            {!loading && (
              <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10, marginBottom:16 }}>
                {[
                  { icon:'👨‍🎓', val:accepted.length, label:'Connected', color:'var(--primary)' },
                  { icon:'⏳', val:pending.length, label:'Pending', color:'#f97316' },
                  { icon:'📊', val:`${avgScore}%`, label:'Avg Score', color:'var(--teal)' },
                ].map(s=>(
                  <div key={s.label} className="card" style={{ padding:14, textAlign:'center' }}>
                    <div style={{ fontSize:22 }}>{s.icon}</div>
                    <div style={{ fontWeight:800, fontSize:20, fontFamily:'Syne', color:s.color }}>{s.val}</div>
                    <div style={{ fontSize:11, color:'var(--muted)' }}>{s.label}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Search & filters */}
            <input className="input" style={{ width:'100%', marginBottom:10 }} placeholder="🔍 Search by name or USN..." value={search} onChange={e=>setSearch(e.target.value)} />
            <div style={{ display:'flex', gap:6, marginBottom:10, flexWrap:'wrap' }}>
              {[['all','All'],['accepted','Connected'],['pending','Pending'],['rejected','Rejected']].map(([k,l])=>(
                <button key={k} onClick={()=>setFilter(k)} style={{ padding:'6px 12px', borderRadius:16, fontSize:11, fontFamily:'Syne', fontWeight:700, border:`2px solid ${filter===k?'var(--primary)':'var(--border)'}`, background:filter===k?'rgba(83,74,183,0.1)':'transparent', color:filter===k?'var(--primary)':'var(--muted)', cursor:'pointer' }}>{l} ({connections.filter(c=>k==='all'||c.status===k).length})</button>
              ))}
            </div>
            {/* Batch/Dept/Year filters */}
            <div style={{ display:'flex', gap:6, marginBottom:14, flexWrap:'wrap' }}>
              <select className="input" style={{ flex:1, minWidth:80, fontSize:12 }} value={batchFilter} onChange={e=>setBatchFilter(e.target.value)}>
                <option value="">All Batches</option>
                {batches.map(b=><option key={b} value={b}>{b}</option>)}
              </select>
              <select className="input" style={{ flex:1, minWidth:80, fontSize:12 }} value={deptFilter} onChange={e=>setDeptFilter(e.target.value)}>
                <option value="">All Depts</option>
                {depts.map(d=><option key={d} value={d}>{d}</option>)}
              </select>
              <select className="input" style={{ flex:1, minWidth:80, fontSize:12 }} value={yearFilter} onChange={e=>setYearFilter(e.target.value)}>
                <option value="">All Years</option>
                {years.map(y=><option key={y} value={y}>{y}</option>)}
              </select>
            </div>

            {/* Announce button */}
            <button onClick={()=>setAnnouncing(false)} className="btn-secondary" style={{ width:'100%', justifyContent:'center', marginBottom:14, fontSize:13 }}>
              📢 Announce to All Connected Students
            </button>

            {loading ? <div style={{ display:'flex', justifyContent:'center', padding:40 }}><Spinner size={32} /></div> :
             filtered.length===0 ? (
               <div className="card" style={{ padding:40, textAlign:'center' }}>
                 <div style={{ fontSize:44 }}>{filter==='pending'?'⏳':'👨‍🎓'}</div>
                 <p style={{ fontWeight:700, marginTop:10 }}>No students {filter==='pending'?'pending':'found'}</p>
                 <p style={{ fontSize:13, color:'var(--muted)', marginTop:4 }}>Share your invite link or code to connect with students.</p>
               </div>
             ) : filtered.map(c=>(
               <div key={c.id} className="card" style={{ padding:14, marginBottom:10, borderLeft:`4px solid ${c.status==='accepted'?'var(--teal)':c.status==='pending'?'#f97316':'var(--border)'}` }}>
                 <div style={{ display:'flex', gap:12, alignItems:'center' }}>
                   <Avatar name={c.studentName} dept={c.studentDept} />
                   <div style={{ flex:1, minWidth:0 }}>
                     <div style={{ fontWeight:700, fontSize:14, fontFamily:'Syne' }}>{c.studentName}</div>
                     <div style={{ fontSize:11, color:'var(--muted)' }}>{c.studentUSN} · {c.studentDept}</div>
                     <div style={{ fontSize:11, color:'var(--muted)' }}>{c.studentBatch} · {c.studentYear}</div>
                     {c.stats && (
                       <div style={{ display:'flex', gap:10, marginTop:5 }}>
                         <span style={{ fontSize:11 }}>📝 {c.stats.attempts} quizzes</span>
                         <span style={{ fontSize:11, color:getGradeColor(c.stats.avgPct), fontWeight:700 }}>📊 {c.stats.avgPct}%</span>
                       </div>
                     )}
                   </div>
                   <div style={{ display:'flex', flexDirection:'column', gap:6, alignItems:'flex-end' }}>
                     {c.status==='pending' && (
                       <div style={{ display:'flex', gap:6 }}>
                         <button onClick={()=>accept(c.id)} className="btn-primary" style={{ padding:'5px 12px', fontSize:11 }}>✓ Accept</button>
                         <button onClick={()=>reject(c.id)} className="btn-ghost" style={{ padding:'5px 10px', fontSize:11, color:'var(--error)' }}>✕</button>
                       </div>
                     )}
                     {c.status==='accepted' && (
                       <div style={{ display:'flex', gap:6 }}>
                         <button onClick={()=>setSelected(c)} className="btn-ghost" style={{ padding:'5px 10px', fontSize:11 }}>📊 View</button>
                         <button onClick={()=>setAnnouncing(c)} className="btn-ghost" style={{ padding:'5px 10px', fontSize:11 }}>📢</button>
                       </div>
                     )}
                     {c.status==='rejected' && <span style={{ fontSize:10, fontWeight:700, color:'#ef4444' }}>REJECTED</span>}
                   </div>
                 </div>
               </div>
             ))
            }
          </>
        )}

        {/* ── INVITE TAB ── */}
        {activeTab==='invite' && (
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            {/* Teacher Code */}
            <div className="card" style={{ padding:20 }}>
              <h3 style={{ fontFamily:'Syne', fontWeight:800, margin:'0 0 6px' }}>🔑 Your Teacher Code</h3>
              <p style={{ fontSize:13, color:'var(--muted)', margin:'0 0 14px' }}>Share this code with students. They enter it in their "Connect to Teacher" section.</p>
              <div style={{ display:'flex', alignItems:'center', gap:10, background:'var(--surface)', borderRadius:12, padding:'14px 16px' }}>
                <span style={{ fontFamily:'JetBrains Mono', fontWeight:800, fontSize:24, color:'var(--primary)', letterSpacing:4, flex:1 }}>{teacherCode || 'Not set'}</span>
                <button onClick={copyCode} className="btn-primary" style={{ padding:'8px 14px', fontSize:12 }}>
                  {copied?'✓ Copied':'Copy'}
                </button>
              </div>
            </div>

            {/* Invite Link */}
            <div className="card" style={{ padding:20 }}>
              <h3 style={{ fontFamily:'Syne', fontWeight:800, margin:'0 0 6px' }}>🔗 Invite Link</h3>
              <p style={{ fontSize:13, color:'var(--muted)', margin:'0 0 14px' }}>Students who click this link will be taken directly to signup with your connection pre-filled.</p>
              <div style={{ background:'var(--surface)', borderRadius:10, padding:'10px 14px', fontSize:12, fontFamily:'JetBrains Mono', color:'var(--text-secondary)', wordBreak:'break-all', marginBottom:12 }}>
                {inviteLink}
              </div>
              <button onClick={copyLink} className="btn-primary" style={{ width:'100%', justifyContent:'center' }}>
                {copied?'✓ Copied!':'📋 Copy Invite Link'}
              </button>
            </div>

            {/* QR placeholder */}
            <div className="card" style={{ padding:20, textAlign:'center' }}>
              <div style={{ fontSize:48, marginBottom:8 }}>📱</div>
              <p style={{ fontWeight:700, fontSize:15, fontFamily:'Syne' }}>Share the code or link</p>
              <p style={{ fontSize:13, color:'var(--muted)', marginTop:4 }}>Students can connect using the Teacher Code in the Connect screen, or by clicking the Invite Link.</p>
            </div>
          </div>
        )}

        {/* ── ANNOUNCEMENTS TAB ── */}
        {activeTab==='announcements' && (
          <div>
            <button onClick={()=>setAnnouncing(false)} className="btn-primary" style={{ width:'100%', justifyContent:'center', marginBottom:14 }}>
              ＋ New Announcement
            </button>
            {announcements.length===0 ? (
              <div className="card" style={{ padding:40, textAlign:'center' }}>
                <div style={{ fontSize:44 }}>📢</div>
                <p style={{ fontWeight:700, marginTop:10 }}>No announcements yet</p>
                <p style={{ fontSize:13, color:'var(--muted)', marginTop:4 }}>Create announcements for your connected students.</p>
              </div>
            ) : announcements.map(a=>(
              <div key={a.id} className="card" style={{ padding:14, marginBottom:10 }}>
                <div style={{ fontWeight:700, fontSize:13, marginBottom:4 }}>{a.title}</div>
                <div style={{ fontSize:13, color:'var(--text-secondary)', lineHeight:1.5 }}>{a.message}</div>
                <div style={{ fontSize:11, color:'var(--muted)', marginTop:8 }}>
                  {a.targetAll ? '→ All students' : `→ ${a.title.replace('Message to ','')}`}
                </div>
              </div>
            ))}
          </div>
        )}

        <div style={{ height:24 }} />
      </div>

      {selected && <StudentDetailSheet connection={selected} onClose={()=>setSelected(null)} />}
      {announcing !== null && <AnnouncementModal connection={announcing||null} onClose={()=>setAnnouncing(null)} />}
    </PageLayout>
  );
}
