import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import useAuthStore from '../stores/authStore';
import useAppStore from '../stores/appStore';
import { Spinner } from '../components/ui';

const DEPARTMENTS = ['CSE','ISE','ECE','EEE','ME','CE','AIML','DS','Cyber Security','Other'];
const BATCHES = ['2021-2025','2022-2026','2023-2027','2024-2028','2025-2029','2026-2030'];
const ACADEMIC_YEARS = ['1st Year','2nd Year','3rd Year','4th Year'];

function AuthLayout({ children }) {
  return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', padding:20, position:'relative', overflow:'hidden' }}>
      <div className="gradient-mesh" />
      <div style={{ width:'100%', maxWidth:480 }}>
        <div style={{ textAlign:'center', marginBottom:28 }}>
          <div style={{ display:'inline-flex', alignItems:'center', justifyContent:'center', width:56, height:56, borderRadius:16, background:'linear-gradient(135deg,#534AB7,#1D9E75)', fontSize:28, marginBottom:10, boxShadow:'0 8px 24px rgba(83,74,183,0.3)' }}>🧠</div>
          <h1 style={{ margin:0, fontSize:26, color:'var(--primary)' }}>QuizForge</h1>
          <p style={{ margin:'4px 0 0', color:'var(--muted)', fontSize:13 }}>Smart Academic Learning Platform</p>
        </div>
        {children}
      </div>
    </div>
  );
}

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuthStore();
  const { toast } = useAppStore();
  const navigate = useNavigate();

  const handle = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const profile = await login(email, password);
      toast('Welcome back! 👋', 'success');
      navigate(profile.role === 'teacher' ? '/teacher' : '/student');
    } catch (err) {
      toast(err.message.includes('user-not-found') || err.message.includes('invalid-credential') ? 'Invalid email or password' : 'Login failed', 'error');
    } finally { setLoading(false); }
  };

  return (
    <AuthLayout>
      <div className="card" style={{ padding:32 }}>
        <h2 style={{ margin:'0 0 6px', fontSize:22 }}>Sign In</h2>
        <p style={{ margin:'0 0 24px', color:'var(--muted)', fontSize:14 }}>Welcome back to QuizForge</p>
        <form onSubmit={handle}>
          <div style={{ marginBottom:14 }}>
            <label className="label">Email</label>
            <input className="input" type="email" placeholder="you@example.com" value={email} onChange={e=>setEmail(e.target.value)} required />
          </div>
          <div style={{ marginBottom:24 }}>
            <label className="label">Password</label>
            <input className="input" type="password" placeholder="••••••••" value={password} onChange={e=>setPassword(e.target.value)} required />
          </div>
          <button className="btn-primary" type="submit" disabled={loading} style={{ width:'100%', justifyContent:'center' }}>
            {loading ? <Spinner size={16} color="white" /> : '→'} Sign In
          </button>
        </form>
        <p style={{ textAlign:'center', marginTop:20, color:'var(--muted)', fontSize:14 }}>
          No account? <Link to="/signup" style={{ color:'var(--primary)', fontWeight:600 }}>Sign Up</Link>
        </p>
      </div>
    </AuthLayout>
  );
}

export function SignupPage() {
  const [searchParams] = useSearchParams();
  const prefillTeacherId = searchParams.get('tid'); // from invite link
  const prefillTeacherName = searchParams.get('tname');

  const [role, setRole] = useState('student');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  // Student fields
  const [usn, setUsn] = useState('');
  const [department, setDepartment] = useState('');
  const [batch, setBatch] = useState('');
  const [academicYear, setAcademicYear] = useState('');
  // Teacher fields
  const [teacherDept, setTeacherDept] = useState('');
  const [loading, setLoading] = useState(false);

  const { signup } = useAuthStore();
  const { toast } = useAppStore();
  const navigate = useNavigate();

  const handle = async (e) => {
    e.preventDefault();
    if (password.length < 6) { toast('Password must be 6+ characters', 'error'); return; }
    if (role === 'student' && (!usn || !department || !batch || !academicYear)) {
      toast('Please fill all academic fields', 'error'); return;
    }
    if (role === 'teacher' && !teacherDept) {
      toast('Please select your department', 'error'); return;
    }
    setLoading(true);
    try {
      const extra = role === 'student'
        ? { usn, department, batch, academicYear }
        : { department: teacherDept };
      const profile = await signup(email, password, name, role, extra);
      toast('Account created! 🎉', 'success');

      // If came from teacher invite link, auto-navigate to connect
      if (role === 'student' && prefillTeacherId) {
        navigate(`/student?connectTeacher=${prefillTeacherId}&tname=${prefillTeacherName || ''}`);
      } else {
        navigate(profile.role === 'teacher' ? '/teacher' : '/student');
      }
    } catch (err) {
      toast(err.message.includes('email-already-in-use') ? 'Email already registered' : 'Signup failed', 'error');
    } finally { setLoading(false); }
  };

  return (
    <AuthLayout>
      <div className="card" style={{ padding:28, maxHeight:'90vh', overflowY:'auto' }}>
        <h2 style={{ margin:'0 0 4px', fontSize:20 }}>Create Account</h2>
        <p style={{ margin:'0 0 20px', color:'var(--muted)', fontSize:13 }}>Join QuizForge today</p>

        {prefillTeacherId && (
          <div style={{ padding:'10px 14px', background:'rgba(83,74,183,0.1)', borderRadius:10, marginBottom:16, fontSize:13, color:'var(--primary)' }}>
            🔗 You were invited by <strong>{decodeURIComponent(prefillTeacherName||'a teacher')}</strong>. Sign up as a student to connect.
          </div>
        )}

        {/* Role Selector */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:20 }}>
          {['teacher','student'].map(r => (
            <button key={r} type="button" onClick={() => setRole(r)} style={{
              padding:'14px 10px', borderRadius:12,
              border:`2px solid ${role===r?'var(--primary)':'var(--border)'}`,
              background:role===r?'rgba(83,74,183,0.08)':'transparent',
              cursor:'pointer', transition:'all 0.2s', textAlign:'center'
            }}>
              <div style={{ fontSize:26, marginBottom:4 }}>{r==='teacher'?'👨‍🏫':'🎓'}</div>
              <div style={{ fontFamily:'Syne', fontWeight:700, fontSize:12, color:role===r?'var(--primary)':'var(--text)', textTransform:'capitalize' }}>{r}</div>
            </button>
          ))}
        </div>

        <form onSubmit={handle}>
          <div style={{ marginBottom:12 }}>
            <label className="label">Full Name</label>
            <input className="input" placeholder="Your full name" value={name} onChange={e=>setName(e.target.value)} required />
          </div>
          <div style={{ marginBottom:12 }}>
            <label className="label">Email</label>
            <input className="input" type="email" placeholder="you@college.edu" value={email} onChange={e=>setEmail(e.target.value)} required />
          </div>
          <div style={{ marginBottom:16 }}>
            <label className="label">Password</label>
            <input className="input" type="password" placeholder="Min 6 characters" value={password} onChange={e=>setPassword(e.target.value)} required />
          </div>

          {/* Student-specific fields */}
          {role === 'student' && (
            <>
              <div style={{ height:1, background:'var(--border)', margin:'4px 0 14px' }} />
              <p style={{ fontSize:12, color:'var(--muted)', marginBottom:12, fontWeight:600 }}>ACADEMIC DETAILS</p>
              <div style={{ marginBottom:12 }}>
                <label className="label">USN / Roll Number</label>
                <input className="input" placeholder="e.g. 1AB21CS001" value={usn} onChange={e=>setUsn(e.target.value.toUpperCase())} required />
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:12 }}>
                <div>
                  <label className="label">Department</label>
                  <select className="input" value={department} onChange={e=>setDepartment(e.target.value)} required style={{ cursor:'pointer' }}>
                    <option value="">Select...</option>
                    {DEPARTMENTS.map(d=><option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Batch</label>
                  <select className="input" value={batch} onChange={e=>setBatch(e.target.value)} required style={{ cursor:'pointer' }}>
                    <option value="">Select...</option>
                    {BATCHES.map(b=><option key={b} value={b}>{b}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ marginBottom:16 }}>
                <label className="label">Current Academic Year</label>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:6 }}>
                  {ACADEMIC_YEARS.map(y=>(
                    <button key={y} type="button" onClick={()=>setAcademicYear(y)} style={{
                      padding:'8px 4px', borderRadius:8, fontSize:11, fontFamily:'Syne', fontWeight:700,
                      border:`2px solid ${academicYear===y?'var(--primary)':'var(--border)'}`,
                      background:academicYear===y?'rgba(83,74,183,0.1)':'transparent',
                      color:academicYear===y?'var(--primary)':'var(--muted)', cursor:'pointer'
                    }}>{y}</button>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Teacher-specific fields */}
          {role === 'teacher' && (
            <>
              <div style={{ height:1, background:'var(--border)', margin:'4px 0 14px' }} />
              <p style={{ fontSize:12, color:'var(--muted)', marginBottom:12, fontWeight:600 }}>ACADEMIC DETAILS</p>
              <div style={{ marginBottom:16 }}>
                <label className="label">Department</label>
                <select className="input" value={teacherDept} onChange={e=>setTeacherDept(e.target.value)} required style={{ cursor:'pointer' }}>
                  <option value="">Select department...</option>
                  {DEPARTMENTS.map(d=><option key={d} value={d}>{d}</option>)}
                </select>
              </div>
            </>
          )}

          <button className="btn-primary" type="submit" disabled={loading} style={{ width:'100%', justifyContent:'center' }}>
            {loading ? <Spinner size={16} color="white" /> : '✓'} Create Account
          </button>
        </form>
        <p style={{ textAlign:'center', marginTop:16, color:'var(--muted)', fontSize:13 }}>
          Have an account? <Link to="/login" style={{ color:'var(--primary)', fontWeight:600 }}>Sign In</Link>
        </p>
      </div>
    </AuthLayout>
  );
}
