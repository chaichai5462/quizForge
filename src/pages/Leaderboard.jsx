import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import useAuthStore from '../stores/authStore';
import { PageLayout } from '../components/layout';
import { EmptyState, Spinner } from '../components/ui';
import { getAllAttempts, getAttemptsByQuiz, getQuiz } from '../services/firestore';
import { formatDuration, getGrade, getGradeColor } from '../utils';

const MEDALS = ['🥇', '🥈', '🥉'];

export function GlobalLeaderboard() {
  const { profile, user } = useAuthStore();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const attempts = await getAllAttempts();
      // Group by userId, take best attempt per quiz
      const byUser = {};
      attempts.forEach(a => {
        const key = a.userId;
        if (!byUser[key]) byUser[key] = { userId: a.userId, name: a.userName, totalScore: 0, attempts: 0 };
        byUser[key].totalScore += (a.score || 0);
        byUser[key].attempts++;
      });
      const ranked = Object.values(byUser)
        .sort((a, b) => b.totalScore - a.totalScore || b.attempts - a.attempts)
        .map((e, i) => ({ ...e, rank: i + 1 }));
      setEntries(ranked);
      setLoading(false);
    })();
  }, []);

  return (
    <PageLayout role={profile?.role || 'student'} title="🏆 Global Leaderboard">
      <div style={{ paddingTop: 16 }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Spinner size={28} /></div>
        ) : entries.length === 0 ? (
          <EmptyState icon="🏆" title="No scores yet" message="Be the first to complete a quiz!" />
        ) : (
          <>
            {/* Top 3 Podium */}
            {entries.length >= 3 && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.1fr 1fr', gap: 8, marginBottom: 20, alignItems: 'flex-end' }}>
                {[entries[1], entries[0], entries[2]].map((e, i) => {
                  const isCenter = i === 1;
                  return (
                    <div key={e.userId} className="card" style={{ padding: '16px 10px', textAlign: 'center', background: isCenter ? 'linear-gradient(135deg, rgba(83,74,183,0.12), rgba(29,158,117,0.08))' : undefined, borderColor: isCenter ? 'var(--primary)' : undefined }}>
                      <div style={{ fontSize: isCenter ? 36 : 28, marginBottom: 6 }}>{MEDALS[[1,0,2][i]]}</div>
                      <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: isCenter ? 14 : 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.name}</div>
                      <div style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: isCenter ? 22 : 18, color: 'var(--primary)', marginTop: 4 }}>{e.totalScore}</div>
                      <div style={{ fontSize: 11, color: 'var(--muted)' }}>pts</div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Full Leaderboard */}
            <div className="card" style={{ overflow: 'hidden' }}>
              {entries.map((e, i) => {
                const isMe = e.userId === profile?.id;
                return (
                  <div key={e.userId} className="leaderboard-row" style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px',
                    borderBottom: i < entries.length - 1 ? '1px solid var(--border)' : 'none',
                    background: isMe ? 'rgba(83,74,183,0.08)' : undefined,
                  }}>
                    <div style={{ width: 28, textAlign: 'center', fontFamily: 'Syne', fontWeight: 800, fontSize: 16, flexShrink: 0 }}>
                      {i < 3 ? MEDALS[i] : <span style={{ color: 'var(--muted)', fontSize: 14 }}>#{e.rank}</span>}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 14 }}>
                        {e.name} {isMe && <span style={{ fontSize: 11, color: 'var(--primary)', fontWeight: 600 }}>(You)</span>}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--muted)' }}>{e.attempts} quiz{e.attempts !== 1 ? 'zes' : ''} taken</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 18, color: 'var(--primary)' }}>{e.totalScore}</div>
                      <div style={{ fontSize: 11, color: 'var(--muted)' }}>pts</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </PageLayout>
  );
}

export function QuizLeaderboard() {
  const { quizId } = useParams();
  const { profile, user } = useAuthStore();
  const [entries, setEntries] = useState([]);
  const [quiz, setQuiz] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [attempts, q] = await Promise.all([
        getAttemptsByQuiz(quizId),
        getQuiz(quizId),
      ]);
      setQuiz(q);
      const ranked = attempts
        .sort((a, b) => b.score - a.score || (a.timeTaken || 999) - (b.timeTaken || 999))
        .map((a, i) => ({ ...a, rank: i + 1 }));
      setEntries(ranked);
      setLoading(false);
    })();
  }, [quizId]);

  return (
    <PageLayout role={profile?.role || 'student'} title={quiz?.title || 'Leaderboard'} showBack>
      <div style={{ paddingTop: 16 }}>
        {loading ? <Spinner size={28} /> : (
          <div className="card" style={{ overflow: 'hidden' }}>
            {entries.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)' }}>No attempts yet</div>
            ) : entries.map((e, i) => {
              const isMe = e.userId === profile?.id;
              const color = getGradeColor(e.percentage);
              return (
                <div key={e.id} className="leaderboard-row" style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px',
                  borderBottom: i < entries.length - 1 ? '1px solid var(--border)' : 'none',
                  background: isMe ? 'rgba(83,74,183,0.08)' : undefined,
                }}>
                  <div style={{ width: 28, textAlign: 'center', fontFamily: 'Syne', fontWeight: 800, fontSize: 16, flexShrink: 0 }}>
                    {i < 3 ? MEDALS[i] : <span style={{ color: 'var(--muted)', fontSize: 13 }}>#{e.rank}</span>}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 14 }}>
                      {e.userName} {isMe && <span style={{ fontSize: 11, color: 'var(--primary)' }}>(You)</span>}
                    </div>
                    {e.timeTaken && <div style={{ fontSize: 12, color: 'var(--muted)' }}>⏱ {formatDuration(e.timeTaken)}</div>}
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 18, color }}>
                      {e.score}/{e.maxScore}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--muted)' }}>{e.percentage}% · {getGrade(e.percentage)}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </PageLayout>
  );
}
