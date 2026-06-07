import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import useAuthStore from '../stores/authStore';
import useAppStore from '../stores/appStore';
import { TopBar } from '../components/layout';
import { Spinner } from '../components/ui';
import { getQuiz, startLiveSession, updateLiveSession, subscribeLiveSession, getAttemptsByQuiz } from '../services/firestore';

export function LiveTeacherControl() {
  const { quizId } = useParams();
  const { profile } = useAuthStore();
  const { toast } = useAppStore();
  const navigate = useNavigate();
  const [quiz, setQuiz] = useState(null);
  const [session, setSession] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [responses, setResponses] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const q = await getQuiz(quizId);
      if (!q) { toast('Quiz not found', 'error'); navigate(-1); return; }
      setQuiz(q);
      
      await startLiveSession(quizId, {
        currentQuestionId: q.questions[0]?.id,
        currentIndex: 0,
        isActive: true,
        totalQuestions: q.questions.length,
        startedAt: new Date().toISOString(),
      });
      
      subscribeLiveSession(quizId, setSession);
      setLoading(false);
    })();
  }, [quizId]);

  useEffect(() => {
    if (!quizId) return;
    const poll = setInterval(async () => {
      const attempts = await getAttemptsByQuiz(quizId);
      const active = attempts.filter(a => !a.submittedAt || new Date(a.submittedAt) > new Date(session?.startedAt));
      setResponses(active.length);
    }, 5000);
    return () => clearInterval(poll);
  }, [quizId, session]);

  async function goTo(idx) {
    if (!quiz || idx < 0 || idx >= quiz.questions.length) return;
    setCurrentIndex(idx);
    await updateLiveSession(quizId, {
      currentIndex: idx,
      currentQuestionId: quiz.questions[idx]?.id,
    });
  }

  async function endSession() {
    await updateLiveSession(quizId, { isActive: false });
    toast('Live session ended', 'success');
    navigate('/teacher/quizzes');
  }

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}><Spinner size={28} /></div>;

  const current = quiz?.questions?.[currentIndex];

  return (
    <div style={{ minHeight: '100vh', background: '#0F0E1A', color: '#F0EEFF' }}>
      <div style={{ background: '#1A1830', borderBottom: '1px solid #2D2A4A', padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <span className="live-pulse" />
        <span style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 16, color: '#EF4444' }}>LIVE</span>
        <span style={{ color: '#9CA3AF', fontSize: 14, flex: 1 }}>{quiz?.title}</span>
        <span style={{ fontSize: 13, color: '#9CA3AF' }}>👥 {responses} responses</span>
        <button onClick={endSession} style={{ background: '#EF4444', color: 'white', border: 'none', borderRadius: 8, padding: '8px 14px', cursor: 'pointer', fontFamily: 'Syne', fontWeight: 700, fontSize: 13 }}>
          End Session
        </button>
      </div>

      <div style={{ padding: '20px 16px', maxWidth: 600, margin: '0 auto' }}>
        {/* Progress */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, fontSize: 14, color: '#9CA3AF' }}>
          <span>Question {currentIndex + 1} of {quiz?.questions?.length}</span>
          <span>{Math.round(((currentIndex + 1) / (quiz?.questions?.length || 1)) * 100)}%</span>
        </div>
        <div style={{ height: 4, background: '#2D2A4A', borderRadius: 2, marginBottom: 24, overflow: 'hidden' }}>
          <div style={{ height: '100%', background: '#534AB7', borderRadius: 2, width: `${((currentIndex + 1) / (quiz?.questions?.length || 1)) * 100}%`, transition: 'width 0.4s' }} />
        </div>

        {/* Current Question */}
        {current && (
          <div style={{ background: '#1A1830', border: '1px solid #2D2A4A', borderRadius: 16, padding: 24, marginBottom: 20 }}>
            <span style={{ fontSize: 11, fontFamily: 'Syne', fontWeight: 600, color: '#534AB7', display: 'block', marginBottom: 12 }}>
              {current.type?.toUpperCase()} · {current.points} PTS
            </span>
            <p style={{ fontSize: 20, fontWeight: 600, margin: 0, lineHeight: 1.5, fontFamily: 'Syne' }}>{current.question}</p>
            {current.options?.length > 0 && (
              <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {current.options.map((opt, i) => (
                  <div key={i} style={{ padding: '10px 14px', border: '1px solid #2D2A4A', borderRadius: 10, fontSize: 14, display: 'flex', gap: 10 }}>
                    <span style={{ color: '#534AB7', fontWeight: 700, fontFamily: 'Syne' }}>{String.fromCharCode(65+i)}.</span>
                    {opt}
                  </div>
                ))}
              </div>
            )}
            <div style={{ marginTop: 16, padding: '10px 14px', background: 'rgba(29,158,117,0.1)', border: '1px solid rgba(29,158,117,0.3)', borderRadius: 10, fontSize: 13, color: '#1D9E75' }}>
              ✓ Answer: {Array.isArray(current.answer) ? current.answer.join(' → ') : current.answer}
            </div>
          </div>
        )}

        {/* Controls */}
        <div style={{ display: 'flex', gap: 12 }}>
          <button
            onClick={() => goTo(currentIndex - 1)}
            disabled={currentIndex === 0}
            style={{ flex: 1, padding: '14px', borderRadius: 12, border: '2px solid #2D2A4A', background: 'transparent', color: currentIndex === 0 ? '#4B5563' : '#F0EEFF', cursor: currentIndex === 0 ? 'not-allowed' : 'pointer', fontFamily: 'Syne', fontWeight: 700, fontSize: 15 }}
          >
            ← Previous
          </button>
          <button
            onClick={() => goTo(currentIndex + 1)}
            disabled={currentIndex >= (quiz?.questions?.length || 0) - 1}
            style={{ flex: 1, padding: '14px', borderRadius: 12, border: 'none', background: '#534AB7', color: 'white', cursor: 'pointer', fontFamily: 'Syne', fontWeight: 700, fontSize: 15 }}
          >
            Next →
          </button>
        </div>

        {/* Question dots */}
        <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginTop: 20, flexWrap: 'wrap' }}>
          {quiz?.questions?.map((_, i) => (
            <div key={i}
              onClick={() => goTo(i)}
              style={{ width: 10, height: 10, borderRadius: '50%', cursor: 'pointer', transition: 'all 0.2s', background: i === currentIndex ? '#534AB7' : i < currentIndex ? '#1D9E75' : '#2D2A4A' }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
