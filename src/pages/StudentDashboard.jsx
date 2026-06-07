import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import useAuthStore from '../stores/authStore';
import useAppStore from '../stores/appStore';
import { PageLayout, TopBar } from '../components/layout';
import { EmptyState, StatusBadge, DifficultyBadge, StatCard, Spinner } from '../components/ui';
import {
  getConnectionsByStudent, getAttemptsByStudent,
  getQuizzesByTeacherIds, getAllTeachers, createConnection
} from '../services/firestore';

export function StudentDashboard() {
  const { profile, user } = useAuthStore();
  const { toast } = useAppStore();
  const [quizzes, setQuizzes] = useState([]);
  const [attempts, setAttempts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [joinCode, setJoinCode] = useState('');
  const navigate = useNavigate();

  useEffect(() => { loadData(); }, [profile]);

  async function loadData() {
    if (!profile) return;
    setLoading(true);
    try {
      const [connections, myAttempts] = await Promise.all([
        getConnectionsByStudent(user?.uid || profile?.id),
        getAttemptsByStudent(user?.uid || profile?.id),
      ]);
      const acceptedTeachers = connections.filter(c => c.status === 'accepted').map(c => c.teacherId);
      const quizList = await getQuizzesByTeacherIds(acceptedTeachers);
      setQuizzes(quizList.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)));
      setAttempts(myAttempts);
    } catch (err) {
      toast('Failed to load data', 'error');
    } finally { setLoading(false); }
  }

  async function handleJoin() {
    const code = joinCode.trim().toUpperCase();
    if (code.length !== 6) { toast('Enter a valid 6-character code', 'error'); return; }
    navigate(`/quiz/join/${code}`);
  }

  const avgScore = attempts.length > 0
    ? Math.round(attempts.reduce((s, a) => s + (a.percentage || 0), 0) / attempts.length)
    : 0;

  return (
    <PageLayout role="student">
      <div style={{ paddingTop: 16 }}>
        {/* Header */}
        <div style={{ marginBottom: 20 }}>
          <h1 style={{ margin: 0, fontSize: 24 }}>Hello, {profile?.name?.split(' ')[0]} 👋</h1>
          <p style={{ margin: '4px 0 0', color: 'var(--muted)', fontSize: 14 }}>Ready to learn?</p>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
          <StatCard icon="📝" label="Quizzes Taken" value={attempts.length} color="var(--primary)" />
          <StatCard icon="📊" label="Avg Score" value={`${avgScore}%`} color="var(--teal)" />
        </div>

        {/* Join by Code */}
        <div className="card" style={{ padding: 16, marginBottom: 20 }}>
          <h3 style={{ margin: '0 0 12px', fontSize: 15 }}>🔑 Join by Code</h3>
          <div style={{ display: 'flex', gap: 10 }}>
            <input
              className="input"
              value={joinCode}
              onChange={e => setJoinCode(e.target.value.toUpperCase().slice(0, 6))}
              placeholder="XXXXXX"
              style={{ fontFamily: 'JetBrains Mono', letterSpacing: 4, fontSize: 16, fontWeight: 700, textTransform: 'uppercase', flex: 1 }}
            />
            <button className="btn-primary" onClick={handleJoin} style={{ whiteSpace: 'nowrap' }}>Join →</button>
          </div>
        </div>

        {/* Quick Links */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
          <Link to="/student/teachers" style={{ textDecoration: 'none' }}>
            <div className="card" style={{ padding: 16, textAlign: 'center', cursor: 'pointer' }}>
              <div style={{ fontSize: 28, marginBottom: 6 }}>👨‍🏫</div>
              <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 13 }}>Find Teachers</div>
            </div>
          </Link>
          <Link to="/student/leaderboard" style={{ textDecoration: 'none' }}>
            <div className="card" style={{ padding: 16, textAlign: 'center', cursor: 'pointer' }}>
              <div style={{ fontSize: 28, marginBottom: 6 }}>🏆</div>
              <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 13 }}>Leaderboard</div>
            </div>
          </Link>
        </div>

        {/* Quiz Feed */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <h2 style={{ margin: 0, fontSize: 16 }}>Your Quizzes</h2>
          <Link to="/student/quizzes" style={{ color: 'var(--primary)', fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>View all</Link>
        </div>

        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[1,2].map(i => <div key={i} className="skeleton" style={{ height: 90, borderRadius: 16 }} />)}
          </div>
        ) : quizzes.length === 0 ? (
          <EmptyState
            icon="📚"
            title="No quizzes yet"
            message="Connect with a teacher to see their quizzes"
            action={<Link to="/student/teachers"><button className="btn-primary">Find Teachers</button></Link>}
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {quizzes.slice(0, 5).map(quiz => {
              const attempted = attempts.find(a => a.quizId === quiz.id);
              return <QuizFeedCard key={quiz.id} quiz={quiz} attempted={attempted} />;
            })}
          </div>
        )}
      </div>
    </PageLayout>
  );
}

function QuizFeedCard({ quiz, attempted }) {
  const navigate = useNavigate();
  return (
    <div className="card" style={{ padding: 16 }}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 6 }}>
            <span style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 15 }}>{quiz.title}</span>
            <DifficultyBadge level={quiz.difficulty} />
          </div>
          <div style={{ fontSize: 12, color: 'var(--muted)', display: 'flex', gap: 12 }}>
            <span>👤 {quiz.creatorName}</span>
            <span>❓ {quiz.questions?.length || 0} questions</span>
            {quiz.timeLimitMinutes && <span>⏱ {quiz.timeLimitMinutes}min</span>}
          </div>
          {attempted && (
            <div style={{ marginTop: 8, fontSize: 12 }}>
              <span style={{ color: 'var(--teal)', fontWeight: 600 }}>✓ Score: {attempted.percentage}%</span>
            </div>
          )}
        </div>
        <button
          type="button"
          className={attempted ? 'btn-ghost' : 'btn-primary'}
          style={{ padding: '8px 14px', fontSize: 12, flexShrink: 0 }}
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); navigate(attempted ? `/results/${attempted.id}` : `/attempt/${quiz.id}`); }}
        >
          {attempted ? 'Review' : 'Start'}
        </button>
      </div>
    </div>
  );
}

export function StudentQuizList() {
  const { profile, user } = useAuthStore();
  const [quizzes, setQuizzes] = useState([]);
  const [attempts, setAttempts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [connections, myAttempts] = await Promise.all([
        getConnectionsByStudent(user?.uid || profile?.id),
        getAttemptsByStudent(user?.uid || profile?.id),
      ]);
      const teachers = connections.filter(c => c.status === 'accepted').map(c => c.teacherId);
      const q = await getQuizzesByTeacherIds(teachers);
      setQuizzes(q.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)));
      setAttempts(myAttempts);
      setLoading(false);
    })();
  }, []);

  return (
    <PageLayout role="student" title="All Quizzes">
      {loading ? (
        [1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 90, borderRadius: 16, marginBottom: 10 }} />)
      ) : quizzes.length === 0 ? (
        <EmptyState icon="📚" title="No quizzes" message="Connect with teachers to see their quizzes" />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingTop: 16 }}>
          {quizzes.map(quiz => {
            const attempted = attempts.find(a => a.quizId === quiz.id);
            return <QuizFeedCard key={quiz.id} quiz={quiz} attempted={attempted} />;
          })}
        </div>
      )}
    </PageLayout>
  );
}

export function FindTeachers() {
  const { profile, user } = useAuthStore();
  const { toast } = useAppStore();
  const [teachers, setTeachers] = useState([]);
  const [connections, setConnections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState(null);

  useEffect(() => {
    (async () => {
      const [t, c] = await Promise.all([
        getAllTeachers(),
        getConnectionsByStudent(user?.uid || profile?.id),
      ]);
      setTeachers(t.filter(t => t.id !== (user?.uid || profile?.id)));
      setConnections(c);
      setLoading(false);
    })();
  }, []);

  function getStatus(teacherId) {
    return connections.find(c => c.teacherId === teacherId)?.status;
  }

  async function sendRequest(teacher) {
    setRequesting(teacher.id);
    try {
      await createConnection({
        studentId: user?.uid || profile?.id, studentName: profile?.name, studentEmail: profile?.email || user?.email,
        teacherId: teacher.id, teacherName: teacher.name, status: 'pending',
      });
      setConnections(prev => [...prev, { teacherId: teacher.id, status: 'pending' }]);
      toast('Connection request sent! 📨', 'success');
    } catch { toast('Failed to send request', 'error'); }
    finally { setRequesting(null); }
  }

  return (
    <PageLayout role="student" title="Find Teachers" showBack>
      <div style={{ paddingTop: 16 }}>
        {loading ? (
          [1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 80, borderRadius: 16, marginBottom: 10 }} />)
        ) : teachers.length === 0 ? (
          <EmptyState icon="👨‍🏫" title="No teachers yet" message="No teachers have registered yet" />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {teachers.map(teacher => {
              const status = getStatus(teacher.id);
              return (
                <div key={teacher.id} className="card" style={{ padding: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary), var(--teal))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>
                    👨‍🏫
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 15 }}>{teacher.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--muted)' }}>{teacher.email}</div>
                  </div>
                  {status ? (
                    <span className={`badge ${status === 'accepted' ? 'badge-teal' : status === 'pending' ? 'badge-accent' : 'badge-error'}`} style={{ textTransform: 'capitalize' }}>
                      {status === 'accepted' ? '✓ Connected' : status === 'pending' ? '⏳ Pending' : '✕ Rejected'}
                    </span>
                  ) : (
                    <button
                      className="btn-primary"
                      style={{ padding: '8px 14px', fontSize: 13 }}
                      onClick={() => sendRequest(teacher)}
                      disabled={requesting === teacher.id}
                    >
                      {requesting === teacher.id ? <Spinner size={14} color="white" /> : '+ Connect'}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </PageLayout>
  );
}
