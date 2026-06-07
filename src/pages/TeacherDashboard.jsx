import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import useAuthStore from '../stores/authStore';
import useAppStore from '../stores/appStore';
import { PageLayout, TopBar } from '../components/layout';
import { StatCard, StatusBadge, DifficultyBadge, EmptyState, Spinner } from '../components/ui';
import { getTeacherQuizzes, getConnectionsByTeacher, getAllAttempts, createQuiz, deleteQuiz, updateQuiz } from '../services/firestore';
import { generateJoinCode } from '../utils';

export function TeacherDashboard() {
  const { profile } = useAuthStore();
  const { toast } = useAppStore();
  const [quizzes, setQuizzes] = useState([]);
  const [requests, setRequests] = useState([]);
  const [attempts, setAttempts] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, [profile]);

  async function loadData() {
    if (!profile) return;
    setLoading(true);
    try {
      const [q, c, a] = await Promise.all([
        getTeacherQuizzes(profile.id),
        getConnectionsByTeacher(profile.id),
        getAllAttempts(),
      ]);
      setQuizzes(q.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)));
      setRequests(c.filter(r => r.status === 'pending'));
      setAttempts(a.filter(at => q.some(qz => qz.id === at.quizId)));
    } catch (err) {
      toast('Failed to load data', 'error');
    } finally { setLoading(false); }
  }

  async function handleNewQuiz() {
    const quiz = {
      title: 'New Quiz', subject: '', subjectCode: '', description: '',
      creatorId: profile.id, creatorName: profile.name,
      questions: [], joinCode: generateJoinCode(),
      status: 'draft', timeLimitMinutes: null,
      negativeMarkingEnabled: false, negativeMarkingValue: 0.25,
      shuffleQuestions: false, hideResultsUntilEnd: false,
      isLiveMode: false, difficulty: 'medium',
    };
    const id = await createQuiz(quiz);
    navigate(`/teacher/quiz/${id}/edit`);
  }

  const published = quizzes.filter(q => q.status === 'published').length;
  const totalQuestions = quizzes.reduce((s, q) => s + (q.questions?.length || 0), 0);

  if (loading) return (
    <PageLayout role="teacher" title="Dashboard">
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
        {[1,2,3,4].map(i => <div key={i} className="skeleton" style={{ height: 100, borderRadius: 16 }} />)}
      </div>
    </PageLayout>
  );

  return (
    <PageLayout role="teacher">
      <div style={{ padding: '16px 0' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 24 }}>Hello, {profile?.name?.split(' ')[0]} 👋</h1>
            <p style={{ margin: '4px 0 0', color: 'var(--muted)', fontSize: 14 }}>Teacher Dashboard</p>
          </div>
          {requests.length > 0 && (
            <Link to="/teacher/requests" style={{ textDecoration: 'none' }}>
              <div style={{ position: 'relative' }}>
                <span style={{ fontSize: 28 }}>🔔</span>
                <span style={{
                  position: 'absolute', top: -4, right: -4,
                  background: 'var(--error)', color: 'white',
                  borderRadius: '50%', width: 18, height: 18,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 10, fontWeight: 700, fontFamily: 'Syne'
                }}>{requests.length}</span>
              </div>
            </Link>
          )}
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
          <StatCard icon="📚" label="Total Quizzes" value={quizzes.length} color="var(--primary)" />
          <StatCard icon="✅" label="Published" value={published} color="var(--teal)" />
          <StatCard icon="📝" label="Total Attempts" value={attempts.length} color="var(--accent)" />
          <StatCard icon="❓" label="Questions" value={totalQuestions} color="#8B5CF6" />
        </div>

        {/* Quick Actions */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
          <button className="btn-primary" onClick={handleNewQuiz} style={{ justifyContent: 'center', padding: '14px' }}>
            ＋ New Quiz
          </button>
          <Link to="/teacher/crossword" style={{ textDecoration: 'none' }}>
            <button className="btn-secondary" style={{ width: '100%', justifyContent: 'center', padding: '14px' }}>
              🔤 Crossword
            </button>
          </Link>
        </div>

        {/* Recent Quizzes */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <h2 style={{ margin: 0, fontSize: 16 }}>Recent Quizzes</h2>
          <Link to="/teacher/quizzes" style={{ color: 'var(--primary)', fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>View all</Link>
        </div>

        {quizzes.length === 0 ? (
          <EmptyState
            icon="📋"
            title="No quizzes yet"
            message="Create your first quiz to get started!"
            action={<button className="btn-primary" onClick={handleNewQuiz}>＋ Create Quiz</button>}
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {quizzes.slice(0, 5).map(quiz => (
              <QuizCard key={quiz.id} quiz={quiz} attempts={attempts} onRefresh={loadData} />
            ))}
          </div>
        )}
      </div>
    </PageLayout>
  );
}

function QuizCard({ quiz, attempts, onRefresh }) {
  const navigate = useNavigate();
  const { toast } = useAppStore();
  const quizAttempts = attempts.filter(a => a.quizId === quiz.id);
  const avgScore = quizAttempts.length > 0
    ? Math.round(quizAttempts.reduce((s, a) => s + (a.percentage || 0), 0) / quizAttempts.length)
    : null;

  async function handleDelete() {
    if (!confirm('Delete this quiz? This cannot be undone.')) return;
    await deleteQuiz(quiz.id);
    toast('Quiz deleted', 'success');
    onRefresh();
  }

  async function handlePublish() {
    await updateQuiz(quiz.id, { status: 'published' });
    toast('Quiz published! 🎉', 'success');
    onRefresh();
  }

  return (
    <div className="card" style={{ padding: 16 }}>
      <div style={{ display: 'flex', gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
            <span style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 15, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {quiz.title}
            </span>
            <StatusBadge status={quiz.status} />
          </div>
          <div style={{ display: 'flex', gap: 12, fontSize: 12, color: 'var(--muted)' }}>
            <span>📖 {quiz.questions?.length || 0} questions</span>
            <span>🔑 {quiz.joinCode}</span>
            {avgScore !== null && <span>📊 avg {avgScore}%</span>}
            <span>👥 {quizAttempts.length}</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6, flexShrink: 0, flexDirection: 'column' }}>
          <button
            className="btn-ghost"
            style={{ padding: '6px 12px', fontSize: 12 }}
            onClick={() => navigate(`/teacher/quiz/${quiz.id}/edit`)}
          >
            ✏️ Edit
          </button>
          {quiz.status === 'draft' && (
            <button
              className="btn-primary"
              style={{ padding: '6px 12px', fontSize: 12 }}
              onClick={handlePublish}
            >
              ▶ Publish
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function TeacherQuizList() {
  const { profile } = useAuthStore();
  const { toast } = useAppStore();
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const navigate = useNavigate();

  useEffect(() => { loadQuizzes(); }, []);

  async function loadQuizzes() {
    setLoading(true);
    const q = await getTeacherQuizzes(profile.id);
    setQuizzes(q.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)));
    setLoading(false);
  }

  async function handleDelete(id) {
    if (!confirm('Delete this quiz?')) return;
    await deleteQuiz(id);
    toast('Quiz deleted', 'success');
    loadQuizzes();
  }

  async function handleNew() {
    const quiz = {
      title: 'New Quiz', subject: '', subjectCode: '', description: '',
      creatorId: profile.id, creatorName: profile.name,
      questions: [], joinCode: generateJoinCode(),
      status: 'draft', timeLimitMinutes: null,
      negativeMarkingEnabled: false, negativeMarkingValue: 0.25,
      shuffleQuestions: false, hideResultsUntilEnd: false,
      isLiveMode: false, difficulty: 'medium',
    };
    const id = await createQuiz(quiz);
    navigate(`/teacher/quiz/${id}/edit`);
  }

  const filtered = filter === 'all' ? quizzes : quizzes.filter(q => q.status === filter);

  return (
    <PageLayout role="teacher" title="My Quizzes" right={
      <button className="btn-primary" onClick={handleNew} style={{ padding: '8px 14px', fontSize: 13 }}>＋ New</button>
    }>
      <div style={{ marginBottom: 16, display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
        {['all', 'draft', 'published', 'active'].map(f => (
          <button key={f} className={`tab-btn ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)} style={{ textTransform: 'capitalize', whiteSpace: 'nowrap' }}>
            {f}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 90, borderRadius: 16 }} />)}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState icon="📋" title="No quizzes" message="Create a quiz to get started" action={
          <button className="btn-primary" onClick={handleNew}>＋ Create Quiz</button>
        } />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map(quiz => (
            <div key={quiz.id} className="card" style={{ padding: 16 }}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 6 }}>
                    <span style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 15 }}>{quiz.title}</span>
                    <StatusBadge status={quiz.status} />
                    <DifficultyBadge level={quiz.difficulty} />
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                    <span>{quiz.subject}</span>
                    <span>🔑 {quiz.joinCode}</span>
                    <span>❓ {quiz.questions?.length || 0} questions</span>
                    {quiz.timeLimitMinutes && <span>⏱ {quiz.timeLimitMinutes}min</span>}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <button className="btn-ghost" style={{ padding: '6px 10px', fontSize: 12 }}
                    onClick={() => navigate(`/teacher/quiz/${quiz.id}/view`)}>👁 View</button>
                  <button className="btn-ghost" style={{ padding: '6px 10px', fontSize: 12 }}
                    onClick={() => navigate(`/teacher/quiz/${quiz.id}/edit`)}>✏️ Edit</button>
                  <button className="btn-ghost" style={{ padding: '6px 10px', fontSize: 12, color: 'var(--error)' }}
                    onClick={() => handleDelete(quiz.id)}>🗑 Delete</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </PageLayout>
  );
}
