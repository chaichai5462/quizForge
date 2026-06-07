import { useState, useEffect } from 'react';
import useAuthStore from '../stores/authStore';
import useAppStore from '../stores/appStore';
import { PageLayout } from '../components/layout';
import { StatCard, EmptyState, Spinner, ProgressBar } from '../components/ui';
import {
  getTeacherQuizzes, getAllAttempts, getConnectionsByTeacher, updateConnection
} from '../services/firestore';
import { getGrade, getGradeColor, formatDuration, downloadResultPDF, downloadQuizPDF } from '../utils';

export function TeacherAnalytics() {
  const { profile, user } = useAuthStore();
  const [quizzes, setQuizzes] = useState([]);
  const [attempts, setAttempts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedQuiz, setSelectedQuiz] = useState(null);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    const [q, a] = await Promise.all([
      getTeacherQuizzes(profile.id),
      getAllAttempts(),
    ]);
    setQuizzes(q);
    const myAttempts = a.filter(att => q.some(qz => qz.id === att.quizId));
    setAttempts(myAttempts);
    setLoading(false);
  }

  if (loading) return (
    <PageLayout role="teacher" title="Analytics">
      <div style={{ paddingTop: 16, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {[1,2,3,4].map(i => <div key={i} className="skeleton" style={{ height: 100, borderRadius: 16 }} />)}
      </div>
    </PageLayout>
  );

  const published = quizzes.filter(q => q.status === 'published').length;
  const avgScore = attempts.length > 0
    ? Math.round(attempts.reduce((s, a) => s + (a.percentage || 0), 0) / attempts.length)
    : 0;

  return (
    <PageLayout role="teacher" title="Analytics">
      <div style={{ paddingTop: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
          <StatCard icon="📚" label="Total Quizzes" value={quizzes.length} color="var(--primary)" />
          <StatCard icon="✅" label="Published" value={published} color="var(--teal)" />
          <StatCard icon="📝" label="Total Attempts" value={attempts.length} color="var(--accent)" />
          <StatCard icon="📊" label="Avg Score" value={`${avgScore}%`} color="#8B5CF6" />
        </div>

        <h3 style={{ margin: '0 0 12px', fontSize: 15 }}>Per-Quiz Stats</h3>
        {quizzes.length === 0 ? (
          <EmptyState icon="📊" title="No data yet" message="Create and publish quizzes to see analytics" />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {quizzes.map(quiz => {
              const quizAttempts = attempts.filter(a => a.quizId === quiz.id);
              const avg = quizAttempts.length > 0
                ? Math.round(quizAttempts.reduce((s, a) => s + (a.percentage || 0), 0) / quizAttempts.length)
                : null;

              return (
                <div key={quiz.id} className="card" style={{ padding: 16 }}>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 15, marginBottom: 4 }}>{quiz.title}</div>
                      <div style={{ fontSize: 12, color: 'var(--muted)', display: 'flex', gap: 12, marginBottom: 8 }}>
                        <span>👥 {quizAttempts.length} attempts</span>
                        {avg !== null && <span style={{ color: getGradeColor(avg) }}>📊 avg {avg}%</span>}
                        <span>❓ {quiz.questions?.length || 0} questions</span>
                      </div>
                      {avg !== null && <ProgressBar value={avg} max={100} />}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <button
                        className="btn-ghost"
                        style={{ padding: '6px 10px', fontSize: 12 }}
                        onClick={() => setSelectedQuiz(selectedQuiz?.id === quiz.id ? null : quiz)}
                      >
                        {selectedQuiz?.id === quiz.id ? 'Hide' : 'Details'}
                      </button>
                      <button
                        className="btn-ghost"
                        style={{ padding: '6px 10px', fontSize: 12 }}
                        onClick={() => downloadQuizPDF(quiz)}
                      >
                        📄 PDF
                      </button>
                    </div>
                  </div>

                  {selectedQuiz?.id === quiz.id && (
                    <div style={{ marginTop: 16 }}>
                      <div style={{ fontSize: 13, fontFamily: 'Syne', fontWeight: 600, marginBottom: 10, color: 'var(--muted)' }}>STUDENT RESULTS</div>
                      {quizAttempts.length === 0 ? (
                        <p style={{ fontSize: 13, color: 'var(--muted)' }}>No attempts yet</p>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          {[...quizAttempts]
                            .sort((a, b) => b.score - a.score)
                            .map((att, i) => (
                              <div key={att.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: 'var(--bg)', borderRadius: 10 }}>
                                <span style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 14, width: 24, color: 'var(--muted)' }}>#{i+1}</span>
                                <span style={{ flex: 1, fontSize: 14, fontWeight: 500 }}>{att.userName}</span>
                                <span style={{ fontFamily: 'Syne', fontWeight: 700, color: getGradeColor(att.percentage) }}>{att.percentage}%</span>
                                <span className={`badge ${att.percentage >= 70 ? 'badge-teal' : att.percentage >= 50 ? 'badge-accent' : 'badge-error'}`}>{getGrade(att.percentage)}</span>
                                {att.timeTaken && <span style={{ fontSize: 11, color: 'var(--muted)' }}>{formatDuration(att.timeTaken)}</span>}
                              </div>
                            ))}
                        </div>
                      )}
                    </div>
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

export function StudentRequests() {
  const { profile, user } = useAuthStore();
  const { toast } = useAppStore();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(null);

  useEffect(() => { loadRequests(); }, []);

  async function loadRequests() {
    const conns = await getConnectionsByTeacher(profile.id);
    setRequests(conns.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)));
    setLoading(false);
  }

  async function handleRespond(id, status) {
    setProcessing(id);
    try {
      await updateConnection(id, { status });
      setRequests(prev => prev.map(r => r.id === id ? { ...r, status } : r));
      toast(status === 'accepted' ? 'Student connected! 🎉' : 'Request rejected', status === 'accepted' ? 'success' : 'info');
    } catch { toast('Failed to update', 'error'); }
    finally { setProcessing(null); }
  }

  const pending = requests.filter(r => r.status === 'pending');
  const others = requests.filter(r => r.status !== 'pending');

  return (
    <PageLayout role="teacher" title={`Students ${pending.length > 0 ? `(${pending.length} pending)` : ''}`}>
      <div style={{ paddingTop: 16 }}>
        {loading ? (
          [1,2].map(i => <div key={i} className="skeleton" style={{ height: 80, borderRadius: 16, marginBottom: 10 }} />)
        ) : requests.length === 0 ? (
          <EmptyState icon="👥" title="No requests yet" message="Students will appear here when they request to connect" />
        ) : (
          <>
            {pending.length > 0 && (
              <>
                <h3 style={{ margin: '0 0 12px', fontSize: 15, color: 'var(--accent)' }}>⏳ Pending ({pending.length})</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
                  {pending.map(r => (
                    <div key={r.id} className="card" style={{ padding: 16 }}>
                      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                        <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary), var(--teal))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>🎓</div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 15 }}>{r.studentName}</div>
                          <div style={{ fontSize: 12, color: 'var(--muted)' }}>{r.studentEmail}</div>
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button
                            className="btn-danger"
                            style={{ padding: '8px 12px', fontSize: 13 }}
                            onClick={() => handleRespond(r.id, 'rejected')}
                            disabled={processing === r.id}
                          >
                            ✕
                          </button>
                          <button
                            className="btn-primary"
                            style={{ padding: '8px 14px', fontSize: 13, background: 'var(--teal)' }}
                            onClick={() => handleRespond(r.id, 'accepted')}
                            disabled={processing === r.id}
                          >
                            {processing === r.id ? <Spinner size={14} color="white" /> : '✓ Accept'}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
            
            {others.length > 0 && (
              <>
                <h3 style={{ margin: '0 0 12px', fontSize: 15 }}>All Students</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {others.map(r => (
                    <div key={r.id} className="card" style={{ padding: 14 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ fontSize: 18 }}>{r.status === 'accepted' ? '✅' : '❌'}</div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 600, fontSize: 14 }}>{r.studentName}</div>
                          <div style={{ fontSize: 12, color: 'var(--muted)' }}>{r.studentEmail}</div>
                        </div>
                        <span className={`badge ${r.status === 'accepted' ? 'badge-teal' : 'badge-error'}`} style={{ textTransform: 'capitalize' }}>{r.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </PageLayout>
  );
}
