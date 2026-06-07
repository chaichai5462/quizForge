import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import useAuthStore from '../stores/authStore';
import useAppStore from '../stores/appStore';
import { getAttemptById, getQuiz, updateAttempt } from '../services/firestore';
import { gradeAnswer } from '../services/ai';
import { getGrade, getGradeColor, formatDuration, downloadResultPDF } from '../utils';
import { ScoreCircle, ProgressBar, TypeIcon, Spinner } from '../components/ui';
import { TopBar } from '../components/layout';

const TYPE_LABELS = { mcq:'Multiple Choice', fill:'Fill in Blank', qna:'Q&A', code:'Code', puzzle:'Puzzle' };

export default function Results() {
  const { attemptId } = useParams();
  const { profile, user } = useAuthStore();
  const { toast } = useAppStore();
  const navigate = useNavigate();
  const [attempt, setAttempt] = useState(null);
  const [quiz, setQuiz] = useState(null);
  const [loading, setLoading] = useState(true);
  const [gradingId, setGradingId] = useState(null);
  const [aiFeedback, setAiFeedback] = useState({});

  useEffect(() => { loadData(); }, [attemptId]);

  async function loadData() {
    try {
      if (!attemptId) { toast('No attempt ID', 'error'); navigate(-1); return; }
      const att = await getAttemptById(attemptId);
      if (!att) { toast('Attempt not found', 'error'); navigate(-1); return; }
      setAttempt(att);
      setAiFeedback(att.aiFeedback || {});
      const q = await getQuiz(att.quizId);
      setQuiz(q);
    } catch (err) {
      console.error(err);
      toast('Failed to load results', 'error');
      navigate(-1);
    }
    setLoading(false);
  }

  async function gradeWithAI(question, qid) {
    setGradingId(qid);
    try {
      const studentAnswer = attempt.answers?.[qid] || '';
      const feedback = await gradeAnswer({
        question: question.question, studentAnswer,
        correctAnswer: question.answer, type: question.type
      });
      const updated = { ...aiFeedback, [qid]: feedback };
      setAiFeedback(updated);
      await updateAttempt(attemptId, { aiFeedback: updated });
      toast('Graded ✓', 'success');
    } catch { toast('AI grading failed', 'error'); }
    setGradingId(null);
  }

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', flexDirection:'column', gap:12 }}>
      <Spinner size={32} />
      <p style={{ color:'var(--muted)' }}>Loading results...</p>
    </div>
  );

  if (!attempt) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', flexDirection:'column', gap:12 }}>
      <p>Results not found.</p>
      <button className="btn-primary" onClick={()=>navigate('/')}>Go Home</button>
    </div>
  );

  const questions = quiz?.questions || [];
  const pct = Math.round(attempt.percentage || 0);
  const grade = getGrade(pct);
  const gradeColor = getGradeColor(pct);
  const isHidden = attempt.hideResults;

  return (
    <div style={{ minHeight:'100vh', paddingBottom:40 }}>
      <div className="gradient-mesh" />
      <TopBar title="Quiz Results" back={profile?.role==='teacher'?'/teacher':'/student'} />

      <div style={{ padding:'20px 16px', maxWidth:600, margin:'0 auto' }}>

        {/* Score card */}
        <div className="card" style={{ padding:28, textAlign:'center', marginBottom:16, background:'linear-gradient(135deg,rgba(83,74,183,0.07),rgba(29,158,117,0.05))' }}>
          <h2 style={{ margin:'0 0 4px', fontFamily:'Syne' }}>{attempt.quizTitle || 'Quiz'}</h2>
          <p style={{ color:'var(--muted)', fontSize:13, margin:'0 0 20px' }}>Completed by {attempt.userName}</p>

          {isHidden ? (
            <div style={{ padding:24 }}>
              <div style={{ fontSize:48, marginBottom:12 }}>🔒</div>
              <p style={{ fontWeight:700 }}>Results Hidden</p>
              <p style={{ color:'var(--muted)', fontSize:13 }}>The teacher has hidden results until the quiz ends.</p>
            </div>
          ) : (
            <>
              <ScoreCircle percentage={pct} size={130} />
              <div style={{ marginTop:16 }}>
                <div style={{ fontFamily:'Syne', fontWeight:800, fontSize:28, color:gradeColor }}>{grade}</div>
                <div style={{ fontSize:14, color:'var(--muted)', marginTop:4 }}>
                  {attempt.score}/{attempt.maxScore} points · {pct}%
                </div>
                {attempt.timeTaken && (
                  <div style={{ fontSize:12, color:'var(--muted)', marginTop:4 }}>
                    ⏱ Time: {formatDuration(attempt.timeTaken)}
                  </div>
                )}
              </div>

              {/* Stats row */}
              <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10, marginTop:20 }}>
                {[
                  { label:'Correct', value:questions.filter(q=>attempt.details?.find(d=>d.id===q.id)?.correct).length, color:'var(--teal)' },
                  { label:'Wrong', value:questions.filter(q=>{const d=attempt.details?.find(d=>d.id===q.id); return d&&!d.correct&&attempt.answers?.[q.id];}).length, color:'#ef4444' },
                  { label:'Skipped', value:questions.filter(q=>!attempt.answers?.[q.id]).length, color:'var(--muted)' },
                ].map(s=>(
                  <div key={s.label} style={{ background:'var(--surface)', borderRadius:10, padding:'10px 6px', textAlign:'center' }}>
                    <div style={{ fontWeight:800, fontSize:20, fontFamily:'Syne', color:s.color }}>{s.value}</div>
                    <div style={{ fontSize:11, color:'var(--muted)' }}>{s.label}</div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Action buttons */}
        <div style={{ display:'flex', gap:10, marginBottom:20 }}>
          <button className="btn-secondary" onClick={()=>navigate(profile?.role==='teacher'?'/teacher':'/student')} style={{ flex:1, justifyContent:'center' }}>
            ← Home
          </button>
          {!isHidden && (
            <button className="btn-ghost" onClick={()=>downloadResultPDF(attempt, quiz)} style={{ flex:1, justifyContent:'center' }}>
              📄 PDF
            </button>
          )}
        </div>

        {/* Question review */}
        {!isHidden && questions.length > 0 && (
          <>
            <h3 style={{ fontFamily:'Syne', fontWeight:800, fontSize:16, marginBottom:12 }}>Question Review</h3>
            {questions.map((q, i) => {
              const studentAnswer = attempt.answers?.[q.id];
              const detail = attempt.details?.find(d=>d.id===q.id);
              const isCorrect = detail?.correct;
              const feedback = aiFeedback[q.id];
              const needsAI = (q.type==='qna'||q.type==='code') && !feedback;

              return (
                <div key={q.id} className="card" style={{ padding:16, marginBottom:12, borderLeft:`4px solid ${isCorrect?'var(--teal)':studentAnswer?'#ef4444':'var(--border)'}` }}>
                  {/* Question header */}
                  <div style={{ display:'flex', gap:8, alignItems:'center', marginBottom:10 }}>
                    <TypeIcon type={q.type} />
                    <span style={{ fontSize:12, color:'var(--muted)', fontFamily:'Syne', fontWeight:600 }}>Q{i+1} · {TYPE_LABELS[q.type]} · {q.points}pts</span>
                    <span style={{ marginLeft:'auto', fontSize:13 }}>
                      {isCorrect ? '✅' : studentAnswer ? '❌' : '⬜'}
                    </span>
                  </div>

                  <p style={{ fontWeight:600, fontSize:14, lineHeight:1.5, margin:'0 0 12px' }}>{q.question}</p>

                  {/* MCQ options */}
                  {q.type==='mcq' && q.options?.map((opt,oi)=>(
                    <div key={oi} style={{ padding:'8px 12px', borderRadius:8, marginBottom:6, fontSize:13,
                      background: opt===q.answer ? 'rgba(29,158,117,0.12)' : opt===studentAnswer && opt!==q.answer ? 'rgba(239,68,68,0.1)' : 'var(--surface)',
                      border: `1.5px solid ${opt===q.answer?'var(--teal)':opt===studentAnswer&&opt!==q.answer?'#ef4444':'var(--border)'}`,
                      display:'flex', alignItems:'center', gap:8
                    }}>
                      <span style={{ fontWeight:700, width:20, color:opt===q.answer?'var(--teal)':opt===studentAnswer&&opt!==q.answer?'#ef4444':'var(--muted)' }}>
                        {String.fromCharCode(65+oi)}
                      </span>
                      <span style={{ flex:1 }}>{opt}</span>
                      {opt===q.answer && <span style={{ fontSize:11, color:'var(--teal)', fontWeight:700 }}>✓ Correct</span>}
                      {opt===studentAnswer && opt!==q.answer && <span style={{ fontSize:11, color:'#ef4444', fontWeight:700 }}>✗ Your answer</span>}
                    </div>
                  ))}

                  {/* Fill/QnA/Code answers */}
                  {(q.type==='fill'||q.type==='qna'||q.type==='code') && (
                    <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                      <div style={{ padding:'10px 12px', borderRadius:8, background:'rgba(29,158,117,0.08)', border:'1.5px solid var(--teal)', fontSize:13 }}>
                        <span style={{ fontWeight:700, color:'var(--teal)', fontSize:11 }}>CORRECT ANSWER</span>
                        <pre style={{ margin:'4px 0 0', fontFamily:q.type==='code'?'JetBrains Mono':'inherit', whiteSpace:'pre-wrap', fontSize:13 }}>{q.answer}</pre>
                      </div>
                      {studentAnswer && (
                        <div style={{ padding:'10px 12px', borderRadius:8, background:'var(--surface)', border:'1.5px solid var(--border)', fontSize:13 }}>
                          <span style={{ fontWeight:700, color:'var(--muted)', fontSize:11 }}>YOUR ANSWER</span>
                          <pre style={{ margin:'4px 0 0', fontFamily:q.type==='code'?'JetBrains Mono':'inherit', whiteSpace:'pre-wrap', fontSize:13 }}>{studentAnswer}</pre>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Puzzle */}
                  {q.type==='puzzle' && (
                    <div style={{ fontSize:13, color:'var(--muted)', marginTop:4 }}>
                      <div>Correct order: {q.answer}</div>
                      {studentAnswer && <div style={{ marginTop:4 }}>Your order: {studentAnswer}</div>}
                    </div>
                  )}

                  {/* Explanation */}
                  {q.explanation && (
                    <div style={{ marginTop:10, padding:'8px 12px', background:'rgba(83,74,183,0.07)', borderRadius:8, fontSize:12, color:'var(--primary)' }}>
                      💡 {q.explanation}
                    </div>
                  )}

                  {/* AI Grading for QnA/Code */}
                  {(q.type==='qna'||q.type==='code') && studentAnswer && (
                    <div style={{ marginTop:10 }}>
                      {feedback ? (
                        <div style={{ padding:'10px 12px', background:'rgba(83,74,183,0.06)', borderRadius:8, fontSize:12 }}>
                          <div style={{ fontWeight:700, color:'var(--primary)', marginBottom:4 }}>🤖 AI Score: {feedback.score}/10</div>
                          <div style={{ color:'var(--text-secondary)', lineHeight:1.6 }}>{feedback.feedback}</div>
                          {feedback.improvements && <div style={{ color:'var(--muted)', marginTop:4 }}>Improve: {feedback.improvements}</div>}
                        </div>
                      ) : (
                        <button onClick={()=>gradeWithAI(q,q.id)} disabled={!!gradingId} className="btn-ghost" style={{ fontSize:12, padding:'6px 12px' }}>
                          {gradingId===q.id ? <><Spinner size={12} /> Grading...</> : '🤖 Grade with AI'}
                        </button>
                      )}
                    </div>
                  )}

                  {/* Blooms/PO tags */}
                  {(q.bloomsLevel||q.poMapping?.length>0) && (
                    <div style={{ display:'flex', gap:6, marginTop:10, flexWrap:'wrap' }}>
                      {q.bloomsLevel && <span style={{ fontSize:10, padding:'2px 8px', borderRadius:4, background:'rgba(83,74,183,0.1)', color:'var(--primary)', fontWeight:700 }}>{q.bloomsLevel}</span>}
                      {q.poMapping?.map(po=><span key={po} style={{ fontSize:10, padding:'2px 8px', borderRadius:4, background:'rgba(29,158,117,0.1)', color:'var(--teal)', fontWeight:700 }}>{po}</span>)}
                    </div>
                  )}
                </div>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}
