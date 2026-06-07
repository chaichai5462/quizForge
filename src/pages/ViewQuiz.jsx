import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getQuiz } from '../services/firestore';
import { TopBar } from '../components/layout';
import { Spinner, TypeIcon } from '../components/ui';
import useAppStore from '../stores/appStore';

const TYPE_LABELS = { mcq:'Multiple Choice', fill:'Fill in Blank', qna:'Q&A', code:'Code', puzzle:'Puzzle Order' };
const BLOOMS_COLORS = { remember:'#ef4444', understand:'#f97316', apply:'#eab308', analyze:'#22c55e', evaluate:'#3b82f6', create:'#8b5cf6' };

export default function ViewQuiz() {
  const { quizId } = useParams();
  const navigate = useNavigate();
  const { toast } = useAppStore();
  const [quiz, setQuiz] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);
  const [showAnswers, setShowAnswers] = useState(true);

  useEffect(() => {
    getQuiz(quizId)
      .then(q => { if (!q) { toast('Quiz not found','error'); navigate(-1); } else setQuiz(q); })
      .catch(() => { toast('Failed to load','error'); navigate(-1); })
      .finally(() => setLoading(false));
  }, [quizId]);

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh' }}>
      <Spinner size={32} />
    </div>
  );

  if (!quiz) return null;

  const questions = quiz.questions || [];
  const totalPts = questions.reduce((s,q)=>s+(q.points||1),0);

  return (
    <div style={{ minHeight:'100vh', paddingBottom:40 }}>
      <div className="gradient-mesh" />
      <TopBar
        title="View Quiz"
        back={`/teacher/quiz/${quizId}/edit`}
        right={
          <div style={{ display:'flex', gap:8 }}>
            <button onClick={()=>setShowAnswers(s=>!s)} className="btn-ghost" style={{ fontSize:12, padding:'6px 12px' }}>
              {showAnswers?'🙈 Hide Answers':'👁 Show Answers'}
            </button>
            <button onClick={()=>navigate(`/teacher/quiz/${quizId}/edit`)} className="btn-primary" style={{ fontSize:12, padding:'6px 12px' }}>
              ✏️ Edit
            </button>
          </div>
        }
      />

      <div style={{ padding:'16px', maxWidth:640, margin:'0 auto' }}>

        {/* Quiz info */}
        <div className="card" style={{ padding:20, marginBottom:16 }}>
          <div style={{ display:'flex', gap:12, alignItems:'flex-start' }}>
            <div style={{ flex:1 }}>
              <h2 style={{ margin:'0 0 4px', fontFamily:'Syne', fontSize:18 }}>{quiz.title}</h2>
              <div style={{ fontSize:13, color:'var(--muted)' }}>{quiz.subject} {quiz.subjectCode?`(${quiz.subjectCode})`:''}</div>
              {quiz.description && <p style={{ fontSize:13, color:'var(--text-secondary)', margin:'8px 0 0', lineHeight:1.5 }}>{quiz.description}</p>}
            </div>
            <span style={{ fontSize:11, fontWeight:700, padding:'3px 10px', borderRadius:6,
              background: quiz.status==='published'?'rgba(29,158,117,0.12)':'rgba(83,74,183,0.1)',
              color: quiz.status==='published'?'var(--teal)':'var(--primary)'
            }}>{quiz.status?.toUpperCase()}</span>
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8, marginTop:16 }}>
            {[
              { label:'Questions', value:questions.length },
              { label:'Total Pts', value:totalPts },
              { label:'Difficulty', value:quiz.difficulty||'medium' },
              { label:'Time', value:quiz.timeLimitMinutes?`${quiz.timeLimitMinutes}min`:'No limit' },
            ].map(s=>(
              <div key={s.label} style={{ textAlign:'center', padding:'10px 6px', background:'var(--surface)', borderRadius:10 }}>
                <div style={{ fontWeight:800, fontSize:15, fontFamily:'Syne', color:'var(--primary)', textTransform:'capitalize' }}>{s.value}</div>
                <div style={{ fontSize:10, color:'var(--muted)', marginTop:2 }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Targeting */}
          {(quiz.targetBatch||quiz.targetYear) && (
            <div style={{ marginTop:12, padding:'8px 12px', background:'rgba(83,74,183,0.07)', borderRadius:8, fontSize:12, color:'var(--primary)' }}>
              🎯 Visible to: {[quiz.targetBatch,quiz.targetYear].filter(Boolean).join(' · ')}
            </div>
          )}

          {/* Join code */}
          <div style={{ marginTop:12, display:'flex', alignItems:'center', gap:10, padding:'10px 14px', background:'var(--surface)', borderRadius:10 }}>
            <span style={{ fontSize:12, color:'var(--muted)' }}>Join Code:</span>
            <span style={{ fontFamily:'JetBrains Mono', fontWeight:800, fontSize:18, color:'var(--primary)', letterSpacing:4 }}>{quiz.joinCode}</span>
          </div>
        </div>

        {/* Bloom's & PO summary */}
        {questions.some(q=>q.bloomsLevel||q.poMapping?.length) && (
          <div className="card" style={{ padding:14, marginBottom:16 }}>
            <p style={{ fontSize:11, fontWeight:700, color:'var(--muted)', marginBottom:8 }}>BLOOM'S & PO COVERAGE</p>
            <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
              {['remember','understand','apply','analyze','evaluate','create'].map(b=>{
                const count = questions.filter(q=>q.bloomsLevel===b).length;
                if (!count) return null;
                return <span key={b} style={{ fontSize:11, fontWeight:700, padding:'3px 8px', borderRadius:6, background:BLOOMS_COLORS[b]+'22', color:BLOOMS_COLORS[b] }}>{b}: {count}</span>;
              })}
              {[...new Set(questions.flatMap(q=>q.poMapping||[]))].map(po=>(
                <span key={po} style={{ fontSize:11, fontWeight:700, padding:'3px 8px', borderRadius:6, background:'rgba(83,74,183,0.1)', color:'var(--primary)' }}>{po}</span>
              ))}
            </div>
          </div>
        )}

        {/* Questions */}
        <h3 style={{ fontFamily:'Syne', fontWeight:800, marginBottom:12 }}>Questions ({questions.length})</h3>
        {questions.length===0 ? (
          <div className="card" style={{ padding:40, textAlign:'center' }}>
            <div style={{ fontSize:40 }}>❓</div>
            <p style={{ fontWeight:700, marginTop:10 }}>No questions yet</p>
            <button onClick={()=>navigate(`/teacher/quiz/${quizId}/edit`)} className="btn-primary" style={{ marginTop:12 }}>Add Questions</button>
          </div>
        ) : questions.map((q,i)=>{
          const isOpen = expanded===q.id;
          const bloom = q.bloomsLevel;

          return (
            <div key={q.id} className="card" style={{ marginBottom:10, overflow:'hidden' }}>
              {/* Question header - always visible */}
              <div
                onClick={()=>setExpanded(isOpen?null:q.id)}
                style={{ padding:'14px 16px', cursor:'pointer', display:'flex', gap:10, alignItems:'center' }}
              >
                <div style={{ width:28, height:28, borderRadius:8, background:'rgba(83,74,183,0.1)', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'Syne', fontWeight:800, fontSize:13, color:'var(--primary)', flexShrink:0 }}>
                  {i+1}
                </div>
                <TypeIcon type={q.type} />
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontWeight:600, fontSize:14, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{q.question}</div>
                  <div style={{ display:'flex', gap:6, marginTop:3, flexWrap:'wrap', alignItems:'center' }}>
                    <span style={{ fontSize:11, color:'var(--muted)' }}>{TYPE_LABELS[q.type]} · {q.points}pt{q.points!==1?'s':''}</span>
                    {bloom && <span style={{ fontSize:10, fontWeight:700, padding:'1px 6px', borderRadius:4, background:BLOOMS_COLORS[bloom]+'22', color:BLOOMS_COLORS[bloom] }}>{bloom}</span>}
                    {q.poMapping?.map(po=><span key={po} style={{ fontSize:10, fontWeight:700, padding:'1px 6px', borderRadius:4, background:'rgba(83,74,183,0.1)', color:'var(--primary)' }}>{po}</span>)}
                  </div>
                </div>
                <span style={{ color:'var(--muted)', fontSize:14 }}>{isOpen?'▲':'▼'}</span>
              </div>

              {/* Expanded detail */}
              {isOpen && (
                <div style={{ padding:'0 16px 16px', borderTop:'1px solid var(--border)' }}>
                  <p style={{ fontSize:14, lineHeight:1.6, margin:'12px 0', fontWeight:500 }}>{q.question}</p>

                  {/* MCQ */}
                  {q.type==='mcq' && q.options?.map((opt,oi)=>(
                    <div key={oi} style={{ display:'flex', gap:8, alignItems:'center', padding:'9px 12px', borderRadius:8, marginBottom:6,
                      background: showAnswers&&opt===q.answer?'rgba(29,158,117,0.1)':'var(--surface)',
                      border:`1.5px solid ${showAnswers&&opt===q.answer?'var(--teal)':'var(--border)'}`
                    }}>
                      <span style={{ fontWeight:700, width:24, fontSize:13, color:showAnswers&&opt===q.answer?'var(--teal)':'var(--muted)' }}>{String.fromCharCode(65+oi)}</span>
                      <span style={{ flex:1, fontSize:13 }}>{opt}</span>
                      {showAnswers&&opt===q.answer&&<span style={{ fontSize:11, color:'var(--teal)', fontWeight:700 }}>✓ Correct</span>}
                    </div>
                  ))}

                  {/* Fill */}
                  {q.type==='fill' && showAnswers && (
                    <div style={{ padding:'10px 12px', background:'rgba(29,158,117,0.08)', borderRadius:8, fontSize:13, color:'var(--teal)', fontWeight:600 }}>
                      ✓ Answer: {q.answer}
                    </div>
                  )}

                  {/* QnA / Code */}
                  {(q.type==='qna'||q.type==='code') && showAnswers && q.answer && (
                    <div style={{ padding:'10px 12px', background:'rgba(29,158,117,0.08)', borderRadius:8, fontSize:13 }}>
                      <div style={{ fontWeight:700, color:'var(--teal)', marginBottom:4, fontSize:11 }}>MODEL ANSWER</div>
                      <pre style={{ margin:0, whiteSpace:'pre-wrap', fontFamily:q.type==='code'?'JetBrains Mono':'inherit', fontSize:13 }}>{q.answer}</pre>
                    </div>
                  )}

                  {/* Puzzle */}
                  {q.type==='puzzle' && (
                    <div style={{ fontSize:13 }}>
                      <div style={{ marginBottom:8, color:'var(--muted)' }}>Shuffled (shown to students): {q.options?.join(' → ')}</div>
                      {showAnswers && <div style={{ color:'var(--teal)', fontWeight:600 }}>✓ Correct order: {q.answer}</div>}
                    </div>
                  )}

                  {/* Explanation */}
                  {q.explanation && (
                    <div style={{ marginTop:10, padding:'8px 12px', background:'rgba(83,74,183,0.07)', borderRadius:8, fontSize:12, color:'var(--primary)' }}>
                      💡 {q.explanation}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
