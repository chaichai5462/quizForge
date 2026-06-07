import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DndContext, closestCenter } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import useAuthStore from '../stores/authStore';
import useAppStore from '../stores/appStore';
import { PageLayout, TopBar } from '../components/layout';
import { Modal, Toggle, Slider, TypeIcon, Spinner } from '../components/ui';
import { getQuiz, updateQuiz } from '../services/firestore';
import { generateQuestions } from '../services/ai';
import { generateJoinCode } from '../utils';

const DIFFICULTIES = ['easy', 'medium', 'hard', 'expert'];
const QUESTION_TYPES = ['mcq', 'fill', 'qna', 'code', 'puzzle'];
const TYPE_LABELS = { mcq: 'Multiple Choice', fill: 'Fill in Blank', qna: 'Q&A', code: 'Code', puzzle: 'Puzzle Order' };

const PO_LIST = [
  { id: 'PO1',  label: 'PO1',  desc: 'Engineering Knowledge' },
  { id: 'PO2',  label: 'PO2',  desc: 'Problem Analysis' },
  { id: 'PO3',  label: 'PO3',  desc: 'Design/Development of Solutions' },
  { id: 'PO4',  label: 'PO4',  desc: 'Conduct Investigations of Complex Problems' },
  { id: 'PO5',  label: 'PO5',  desc: 'Engineering Tool Usage' },
  { id: 'PO6',  label: 'PO6',  desc: 'The Engineer and The World' },
  { id: 'PO7',  label: 'PO7',  desc: 'Ethics' },
  { id: 'PO8',  label: 'PO8',  desc: 'Individual and Collaborative Team Work' },
  { id: 'PO9',  label: 'PO9',  desc: 'Communication' },
  { id: 'PO10', label: 'PO10', desc: 'Project Management and Finance' },
  { id: 'PO11', label: 'PO11', desc: 'Life-Long Learning' },
];

const TARGET_BATCHES = ['2021-2025','2022-2026','2023-2027','2024-2028','2025-2029','2026-2030'];
const TARGET_YEARS = ['1st Year','2nd Year','3rd Year','4th Year'];

const BLOOMS_LEVELS = [
  { id: 'remember',   label: 'Remember',   color: '#ef4444', desc: 'Recall facts and basic concepts' },
  { id: 'understand', label: 'Understand', color: '#f97316', desc: 'Explain ideas or concepts' },
  { id: 'apply',      label: 'Apply',      color: '#eab308', desc: 'Use information in new situations' },
  { id: 'analyze',    label: 'Analyze',    color: '#22c55e', desc: 'Draw connections among ideas' },
  { id: 'evaluate',   label: 'Evaluate',   color: '#3b82f6', desc: 'Justify a decision or course of action' },
  { id: 'create',     label: 'Create',     color: '#8b5cf6', desc: 'Produce new or original work' },
];

function SortableQuestion({ q, index, onEdit, onDelete }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: q.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 };
  const bloom = BLOOMS_LEVELS.find(b => b.id === q.bloomsLevel);

  return (
    <div ref={setNodeRef} style={{ ...style, padding: '12px 14px', marginBottom: 8, background: 'var(--card)', borderRadius: 12, border: '1px solid var(--border)' }}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <div {...attributes} {...listeners} style={{ cursor: 'grab', color: 'var(--muted)', fontSize: 18, flexShrink: 0 }}>⠿</div>
        <TypeIcon type={q.type} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 500, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {index + 1}. {q.question || '(no question)'}
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4, alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: 'var(--muted)' }}>{TYPE_LABELS[q.type]} · {q.points} pts</span>
            {bloom && (
              <span style={{ fontSize: 11, fontWeight: 700, background: bloom.color + '22', color: bloom.color, borderRadius: 4, padding: '1px 7px' }}>
                {bloom.label}
              </span>
            )}
            {q.poMapping && q.poMapping.length > 0 && (
              <span style={{ fontSize: 11, fontWeight: 700, background: 'rgba(83,74,183,0.12)', color: 'var(--primary)', borderRadius: 4, padding: '1px 7px' }}>
                {q.poMapping.join(', ')}
              </span>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button className="btn-ghost" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => onEdit(q)}>✏️</button>
          <button className="btn-ghost" style={{ padding: '4px 10px', fontSize: 12, color: 'var(--error)' }} onClick={() => onDelete(q.id)}>🗑</button>
        </div>
      </div>
    </div>
  );
}

export default function QuizBuilder() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { profile, user } = useAuthStore();
  const { toast } = useAppStore();
  const [quiz, setQuiz] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState('info');
  const [editingQ, setEditingQ] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAIModal, setShowAIModal] = useState(false);

  useEffect(() => { loadQuiz(); }, [id]);

  async function loadQuiz() {
    if (!id) {
      setQuiz({
        title: '', subject: '', subjectCode: '', description: '',
        questions: [], status: 'draft', difficulty: 'medium',
        timeLimitMinutes: 30, negativeMarkingEnabled: false,
        negativeMarkingValue: 0.25, shuffleQuestions: false,
        hideResultsUntilEnd: false, isLiveMode: false,
        joinCode: generateJoinCode(),
      });
      setLoading(false);
      return;
    }
    try {
      const q = await getQuiz(id);
      if (q) setQuiz(q);
      else setQuiz(null);
    } catch (e) {
      console.error('Failed to load quiz', e);
    }
    setLoading(false);
  }

  function update(field, value) {
    setQuiz(prev => ({ ...prev, [field]: value }));
  }

  async function save(statusOverride) {
    setSaving(true);
    try {
      if (!quiz.title?.trim()) { toast('Please enter a quiz title', 'error'); setSaving(false); return; }
      const data = { ...quiz };
      if (statusOverride) data.status = statusOverride;
      delete data.id; delete data.createdAt;
      if (!id) {
        const { createQuiz } = await import('../services/firestore');
        const newId = await createQuiz({ ...data, creatorId: user.uid, creatorName: profile.name });
        navigate(`/teacher/quiz/${newId}/edit`, { replace: true });
      } else {
        await updateQuiz(id, data);
      }
      setQuiz(prev => ({ ...prev, status: data.status }));
      toast(statusOverride === 'published' ? 'Quiz published! 🎉' : 'Saved ✓', 'success');
    } catch (e) { console.error(e); toast('Save failed', 'error'); }
    finally { setSaving(false); }
  }

  function addQuestion(q) {
    const newQ = { ...q, id: `q_${Date.now()}_${Math.random().toString(36).slice(2)}` };
    setQuiz(prev => ({ ...prev, questions: [...(prev.questions || []), newQ] }));
    setShowAddModal(false);
  }

  function updateQuestion(updated) {
    setQuiz(prev => ({ ...prev, questions: prev.questions.map(q => q.id === updated.id ? updated : q) }));
    setEditingQ(null);
  }

  function deleteQuestion(qid) {
    setQuiz(prev => ({ ...prev, questions: prev.questions.filter(q => q.id !== qid) }));
  }

  function handleDragEnd(event) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setQuiz(prev => {
      const oldIndex = prev.questions.findIndex(q => q.id === active.id);
      const newIndex = prev.questions.findIndex(q => q.id === over.id);
      return { ...prev, questions: arrayMove(prev.questions, oldIndex, newIndex) };
    });
  }

  function addAIQuestions(qs) {
    setQuiz(prev => ({ ...prev, questions: [...(prev.questions || []), ...qs] }));
    toast(`Added ${qs.length} questions! ✨`, 'success');
    setShowAIModal(false);
  }

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}><Spinner size={32} /></div>;
  if (!quiz) return <div style={{ padding: 32 }}>Quiz not found</div>;

  return (
    <div style={{ minHeight: '100vh', paddingBottom: 80 }}>
      <div className="gradient-mesh" />
      <TopBar
        title={quiz.title || 'Quiz Builder'}
        back="/teacher/quizzes"
        right={
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn-ghost" onClick={() => save()} disabled={saving} style={{ padding: '8px 14px', fontSize: 13 }}>
              {saving ? <Spinner size={14} /> : '💾'} Save
            </button>
            {quiz.status !== 'published' ? (
              <button className="btn-primary" onClick={() => save('published')} disabled={saving} style={{ padding: '8px 14px', fontSize: 13 }}>
                ▶ Publish
              </button>
            ) : (
              <button className="btn-primary" onClick={() => save('published')} disabled={saving} style={{ padding: '8px 14px', fontSize: 13, background:'var(--teal)' }}>
                🔄 Update
              </button>
            )}
          </div>
        }
      />

      {/* Tabs */}
      <div style={{ background: 'var(--card)', borderBottom: '1px solid var(--border)', padding: '0 16px', display: 'flex', gap: 4 }}>
        {['info', 'questions', 'settings'].map(t => (
          <button key={t} className={`tab-btn ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)} style={{ textTransform: 'capitalize', borderRadius: '8px 8px 0 0' }}>
            {t === 'info' ? '📋 Info' : t === 'questions' ? `❓ Questions (${quiz.questions?.length || 0})` : '⚙️ Settings'}
          </button>
        ))}
      </div>

      <div style={{ padding: 16 }}>
        {tab === 'info' && <InfoTab quiz={quiz} update={update} />}
        {tab === 'questions' && (
          <QuestionsTab
            questions={quiz.questions || []}
            onAdd={() => setShowAddModal(true)}
            onEdit={setEditingQ}
            onDelete={deleteQuestion}
            onDragEnd={handleDragEnd}
            onAIGenerate={() => setShowAIModal(true)}
          />
        )}
        {tab === 'settings' && <SettingsTab quiz={quiz} update={update} />}
      </div>

      {/* Join Code */}
      {quiz.joinCode && (
        <div style={{ margin: '0 16px', padding: '12px 16px', background: 'rgba(83,74,183,0.08)', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 13, color: 'var(--muted)' }}>Join Code:</span>
          <span style={{ fontFamily: 'JetBrains Mono', fontWeight: 700, fontSize: 18, color: 'var(--primary)', letterSpacing: 4 }}>{quiz.joinCode}</span>
          <button className="btn-ghost" style={{ padding: '4px 10px', fontSize: 12, marginLeft: 'auto' }} onClick={() => update('joinCode', generateJoinCode())}>🔄 New</button>
        </div>
      )}

      {/* Add Question Modal */}
      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Add Question" maxWidth={640}>
        <QuestionForm onSave={addQuestion} onCancel={() => setShowAddModal(false)} />
      </Modal>

      {/* Edit Question Modal */}
      {editingQ && (
        <Modal isOpen={!!editingQ} onClose={() => setEditingQ(null)} title="Edit Question" maxWidth={640}>
          <QuestionForm initial={editingQ} onSave={updateQuestion} onCancel={() => setEditingQ(null)} />
        </Modal>
      )}

      {/* AI Generate Modal */}
      <Modal isOpen={showAIModal} onClose={() => setShowAIModal(false)} title="🤖 AI Generate Questions" maxWidth={500}>
        <AIGenerateForm onAdd={addAIQuestions} onCancel={() => setShowAIModal(false)} />
      </Modal>
    </div>
  );
}

function InfoTab({ quiz, update }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <label className="label">Quiz Title *</label>
        <input className="input" value={quiz.title || ''} onChange={e => update('title', e.target.value)} placeholder="e.g., Introduction to Algebra" />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div>
          <label className="label">Subject</label>
          <input className="input" value={quiz.subject || ''} onChange={e => update('subject', e.target.value)} placeholder="e.g., Mathematics" />
        </div>
        <div>
          <label className="label">Subject Code</label>
          <input className="input" value={quiz.subjectCode || ''} onChange={e => update('subjectCode', e.target.value)} placeholder="e.g., MATH101" />
        </div>
      </div>
      <div>
        <label className="label">Description</label>
        <textarea className="input" value={quiz.description || ''} onChange={e => update('description', e.target.value)} placeholder="What is this quiz about?" rows={3} style={{ resize: 'vertical' }} />
      </div>
      <div>
        <label className="label">Difficulty</label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
          {DIFFICULTIES.map(d => (
            <button key={d} type="button"
              style={{ padding: '10px 4px', borderRadius: 10, border: `2px solid ${quiz.difficulty === d ? 'var(--primary)' : 'var(--border)'}`, background: quiz.difficulty === d ? 'rgba(83,74,183,0.1)' : 'transparent', cursor: 'pointer', fontFamily: 'Syne', fontWeight: 700, fontSize: 12, color: quiz.difficulty === d ? 'var(--primary)' : 'var(--muted)', textTransform: 'capitalize', transition: 'all 0.2s' }}
              onClick={() => update('difficulty', d)}
            >{d}</button>
          ))}
        </div>
      </div>
    </div>
  );
}

function QuestionsTab({ questions, onAdd, onEdit, onDelete, onDragEnd, onAIGenerate }) {
  // Summary counts
  const bloomCounts = BLOOMS_LEVELS.map(b => ({ ...b, count: questions.filter(q => q.bloomsLevel === b.id).length })).filter(b => b.count > 0);
  const poCounts = PO_LIST.map(po => ({ ...po, count: questions.filter(q => q.poMapping?.includes(po.id)).length })).filter(po => po.count > 0);

  return (
    <div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
        <button className="btn-primary" onClick={onAdd} style={{ flex: 1, justifyContent: 'center' }}>＋ Add Question</button>
        <button className="btn-secondary" onClick={onAIGenerate} style={{ flex: 1, justifyContent: 'center' }}>🤖 AI Generate</button>
      </div>

      {/* PO + Blooms summary */}
      {questions.length > 0 && (
        <div style={{ marginBottom: 16, padding: 12, background: 'rgba(83,74,183,0.06)', borderRadius: 12, border: '1px solid var(--border)' }}>
          {bloomCounts.length > 0 && (
            <div style={{ marginBottom: 8 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', marginBottom: 6 }}>BLOOM'S DISTRIBUTION</p>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {bloomCounts.map(b => (
                  <span key={b.id} style={{ fontSize: 11, fontWeight: 700, background: b.color + '22', color: b.color, borderRadius: 6, padding: '3px 8px' }}>
                    {b.label}: {b.count}
                  </span>
                ))}
              </div>
            </div>
          )}
          {poCounts.length > 0 && (
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', marginBottom: 6 }}>PO COVERAGE</p>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {poCounts.map(po => (
                  <span key={po.id} style={{ fontSize: 11, fontWeight: 700, background: 'rgba(83,74,183,0.12)', color: 'var(--primary)', borderRadius: 6, padding: '3px 8px' }}>
                    {po.label}: {po.count}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {questions.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--muted)' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>❓</div>
          <p>No questions yet. Add some!</p>
        </div>
      ) : (
        <DndContext collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={questions.map(q => q.id)} strategy={verticalListSortingStrategy}>
            {questions.map((q, i) => (
              <SortableQuestion key={q.id} q={q} index={i} onEdit={onEdit} onDelete={onDelete} />
            ))}
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}

function SettingsTab({ quiz, update }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {/* Quiz Targeting */}
      <div style={{ padding:'16px 0', borderBottom:'1px solid var(--border)' }}>
        <div style={{ fontWeight:700, fontSize:14, marginBottom:4 }}>🎯 Target Audience</div>
        <div style={{ fontSize:12, color:'var(--muted)', marginBottom:12 }}>Restrict quiz visibility to specific batches or academic years. Leave blank to allow all connected students.</div>
        <div style={{ marginBottom:10 }}>
          <label className="label" style={{ fontSize:11 }}>Batch (optional)</label>
          <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
            <button type="button" onClick={()=>update('targetBatch','')} style={{ padding:'5px 12px', borderRadius:8, fontSize:11, fontFamily:'Syne', fontWeight:600, border:`2px solid ${!quiz.targetBatch?'var(--primary)':'var(--border)'}`, background:!quiz.targetBatch?'rgba(83,74,183,0.1)':'transparent', color:!quiz.targetBatch?'var(--primary)':'var(--muted)', cursor:'pointer' }}>All</button>
            {TARGET_BATCHES.map(b=>(
              <button key={b} type="button" onClick={()=>update('targetBatch', quiz.targetBatch===b?'':b)} style={{ padding:'5px 12px', borderRadius:8, fontSize:11, fontFamily:'Syne', fontWeight:600, border:`2px solid ${quiz.targetBatch===b?'var(--primary)':'var(--border)'}`, background:quiz.targetBatch===b?'rgba(83,74,183,0.1)':'transparent', color:quiz.targetBatch===b?'var(--primary)':'var(--muted)', cursor:'pointer' }}>{b}</button>
            ))}
          </div>
        </div>
        <div>
          <label className="label" style={{ fontSize:11 }}>Academic Year (optional)</label>
          <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
            <button type="button" onClick={()=>update('targetYear','')} style={{ padding:'5px 12px', borderRadius:8, fontSize:11, fontFamily:'Syne', fontWeight:600, border:`2px solid ${!quiz.targetYear?'var(--primary)':'var(--border)'}`, background:!quiz.targetYear?'rgba(83,74,183,0.1)':'transparent', color:!quiz.targetYear?'var(--primary)':'var(--muted)', cursor:'pointer' }}>All</button>
            {TARGET_YEARS.map(y=>(
              <button key={y} type="button" onClick={()=>update('targetYear', quiz.targetYear===y?'':y)} style={{ padding:'5px 12px', borderRadius:8, fontSize:11, fontFamily:'Syne', fontWeight:600, border:`2px solid ${quiz.targetYear===y?'var(--teal)':'var(--border)'}`, background:quiz.targetYear===y?'rgba(29,158,117,0.1)':'transparent', color:quiz.targetYear===y?'var(--teal)':'var(--muted)', cursor:'pointer' }}>{y}</button>
            ))}
          </div>
        </div>
        {(quiz.targetBatch||quiz.targetYear) && (
          <div style={{ marginTop:10, padding:'8px 12px', background:'rgba(83,74,183,0.07)', borderRadius:8, fontSize:12, color:'var(--primary)' }}>
            🔒 Visible to: {[quiz.targetBatch, quiz.targetYear].filter(Boolean).join(' · ')} students connected to you
          </div>
        )}
      </div>
      {[
        {
          label: 'Time Limit', icon: '⏱',
          right: <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {quiz.timeLimitMinutes && <span style={{ fontFamily: 'Syne', fontWeight: 700, color: 'var(--primary)' }}>{quiz.timeLimitMinutes}min</span>}
            <Toggle value={!!quiz.timeLimitMinutes} onChange={v => update('timeLimitMinutes', v ? 30 : null)} />
          </div>,
          extra: quiz.timeLimitMinutes ? <div style={{ paddingBottom: 16 }}><Slider min={5} max={120} value={quiz.timeLimitMinutes} onChange={v => update('timeLimitMinutes', v)} /></div> : null
        },
        {
          label: 'Negative Marking', icon: '➖',
          sub: quiz.negativeMarkingEnabled ? `−${quiz.negativeMarkingValue} per wrong answer` : 'Off',
          right: <Toggle value={quiz.negativeMarkingEnabled} onChange={v => update('negativeMarkingEnabled', v)} />,
          extra: quiz.negativeMarkingEnabled ? (
            <div style={{ paddingBottom: 16 }}>
              <Slider min={0.25} max={1} step={0.25} value={quiz.negativeMarkingValue} onChange={v => update('negativeMarkingValue', v)} />
            </div>
          ) : null
        },
        { label: 'Shuffle Questions', icon: '🔀', right: <Toggle value={quiz.shuffleQuestions} onChange={v => update('shuffleQuestions', v)} /> },
        { label: 'Hide Results Until End', icon: '🙈', right: <Toggle value={quiz.hideResultsUntilEnd} onChange={v => update('hideResultsUntilEnd', v)} /> },
        { label: 'Live Quiz Mode', icon: '🔴', sub: 'Control question flow in real time', right: <Toggle value={quiz.isLiveMode} onChange={v => update('isLiveMode', v)} /> },
      ].map((s, i) => (
        <div key={i}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 0', borderBottom: '1px solid var(--border)' }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{s.icon} {s.label}</div>
              {s.sub && <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{s.sub}</div>}
            </div>
            {s.right}
          </div>
          {s.extra}
        </div>
      ))}
    </div>
  );
}

function QuestionForm({ initial, onSave, onCancel }) {
  const [type, setType] = useState(initial?.type || 'mcq');
  const [q, setQ] = useState(initial?.question || '');
  const [opts, setOpts] = useState(initial?.options?.length ? initial.options : ['', '', '', '']);
  const [answer, setAnswer] = useState(initial?.answer || '');
  const [explanation, setExplanation] = useState(initial?.explanation || '');
  const [points, setPoints] = useState(initial?.points || 1);
  const [bloomsLevel, setBloomsLevel] = useState(initial?.bloomsLevel || '');
  const [poMapping, setPoMapping] = useState(initial?.poMapping || []);

  function togglePO(po) {
    setPoMapping(prev => prev.includes(po) ? prev.filter(p => p !== po) : [...prev, po]);
  }

  function handleSave() {
    if (!q.trim()) return;
    onSave({ id: initial?.id || `q_${Date.now()}`, type, question: q, options: opts, answer, explanation, points, bloomsLevel, poMapping });
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Type */}
      <div>
        <label className="label">Question Type</label>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {QUESTION_TYPES.map(t => (
            <button key={t} type="button"
              style={{ padding: '6px 12px', borderRadius: 8, border: `2px solid ${type === t ? 'var(--primary)' : 'var(--border)'}`, background: type === t ? 'rgba(83,74,183,0.1)' : 'transparent', cursor: 'pointer', fontFamily: 'Syne', fontWeight: 600, fontSize: 11, color: type === t ? 'var(--primary)' : 'var(--muted)', transition: 'all 0.15s', textTransform: 'capitalize' }}
              onClick={() => setType(t)}
            >{t}</button>
          ))}
        </div>
      </div>

      {/* Question */}
      <div>
        <label className="label">Question</label>
        <textarea className="input" value={q} onChange={e => setQ(e.target.value)} placeholder="Enter your question..." rows={3} style={{ resize: 'vertical' }} />
      </div>

      {/* MCQ Options */}
      {type === 'mcq' && (
        <div>
          <label className="label">Options (click circle to mark correct answer)</label>
          {opts.map((opt, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
              <button type="button" onClick={() => setAnswer(opt)}
                style={{ width: 28, height: 28, borderRadius: '50%', border: `2px solid ${answer === opt ? 'var(--teal)' : 'var(--border)'}`, background: answer === opt ? 'var(--teal)' : 'transparent', cursor: 'pointer', color: answer === opt ? 'white' : 'var(--muted)', fontWeight: 700, fontSize: 12, flexShrink: 0 }}
              >{String.fromCharCode(65 + i)}</button>
              <input className="input" value={opt} onChange={e => { const n = [...opts]; n[i] = e.target.value; setOpts(n); if (answer === opts[i]) setAnswer(e.target.value); }} placeholder={`Option ${String.fromCharCode(65 + i)}`} />
            </div>
          ))}
        </div>
      )}

      {/* Fill / QnA / Code */}
      {(type === 'fill' || type === 'qna' || type === 'code') && (
        <div>
          <label className="label">{type === 'fill' ? 'Correct Answer' : type === 'code' ? 'Model Answer (code)' : 'Model Answer'}</label>
          {type === 'code' ? (
            <textarea className="code-editor" value={answer} onChange={e => setAnswer(e.target.value)} placeholder="Write working code here..." rows={6} />
          ) : (
            <textarea className="input" value={answer} onChange={e => setAnswer(e.target.value)} placeholder={type === 'fill' ? 'Exact word (case-insensitive)' : 'Model answer...'} rows={type === 'qna' ? 3 : 1} style={{ resize: 'vertical' }} />
          )}
        </div>
      )}

      {/* Puzzle */}
      {type === 'puzzle' && (
        <div>
          <label className="label">Items (one per line, in CORRECT order)</label>
          <textarea className="input" rows={5}
            value={answer.split(',').join('\n')}
            onChange={e => {
              const items = e.target.value.split('\n').filter(Boolean);
              setAnswer(items.join(','));
              setOpts([...items].sort(() => Math.random() - 0.5));
            }}
            placeholder={'Step 1\nStep 2\nStep 3\nStep 4'}
            style={{ resize: 'vertical' }}
          />
          {opts.length > 0 && <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>Shuffled for students: {opts.join(' → ')}</p>}
        </div>
      )}

      {/* Explanation */}
      <div>
        <label className="label">Explanation (optional)</label>
        <input className="input" value={explanation} onChange={e => setExplanation(e.target.value)} placeholder="Why is this the correct answer?" />
      </div>

      {/* Points */}
      <div>
        <label className="label">Points: {points}</label>
        <Slider min={1} max={10} value={points} onChange={setPoints} />
      </div>

      {/* Bloom's Taxonomy */}
      <div>
        <label className="label">Bloom's Taxonomy Level</label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
          {BLOOMS_LEVELS.map(b => (
            <button key={b.id} type="button" title={b.desc}
              onClick={() => setBloomsLevel(bloomsLevel === b.id ? '' : b.id)}
              style={{ padding: '8px 4px', borderRadius: 8, border: `2px solid ${bloomsLevel === b.id ? b.color : 'var(--border)'}`, background: bloomsLevel === b.id ? b.color + '22' : 'transparent', cursor: 'pointer', fontSize: 11, fontFamily: 'Syne', fontWeight: 700, color: bloomsLevel === b.id ? b.color : 'var(--muted)', transition: 'all 0.15s' }}
            >{b.label}</button>
          ))}
        </div>
        {bloomsLevel && (
          <p style={{ fontSize: 11, color: 'var(--muted)', marginTop: 5 }}>
            💡 {BLOOMS_LEVELS.find(b => b.id === bloomsLevel)?.desc}
          </p>
        )}
      </div>

      {/* PO Mapping */}
      <div>
        <label className="label">Program Outcome (PO) Mapping</label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
          {PO_LIST.map(po => (
            <button key={po.id} type="button" title={po.desc}
              onClick={() => togglePO(po.id)}
              style={{ padding: '8px 4px', borderRadius: 8, border: `2px solid ${poMapping.includes(po.id) ? 'var(--primary)' : 'var(--border)'}`, background: poMapping.includes(po.id) ? 'rgba(83,74,183,0.15)' : 'transparent', cursor: 'pointer', fontSize: 11, fontFamily: 'Syne', fontWeight: 700, color: poMapping.includes(po.id) ? 'var(--primary)' : 'var(--muted)', transition: 'all 0.15s' }}
            >{po.label}</button>
          ))}
        </div>
        {poMapping.length > 0 && (
          <div style={{ marginTop: 6, fontSize: 11, color: 'var(--muted)', lineHeight: 1.8 }}>
            {poMapping.map(p => {
              const po = PO_LIST.find(x => x.id === p);
              return po ? <span key={po.id} style={{ marginRight: 10 }}>• <strong>{po.label}</strong>: {po.desc}</span> : null;
            })}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 4 }}>
        <button className="btn-ghost" onClick={onCancel}>Cancel</button>
        <button className="btn-primary" onClick={handleSave}>
          {initial ? '✓ Update' : '＋ Add'}
        </button>
      </div>
    </div>
  );
}

function AIGenerateForm({ onAdd, onCancel }) {
  const { toast } = useAppStore();
  const [subject, setSubject] = useState('');
  const [topic, setTopic] = useState('');
  const [difficulty, setDifficulty] = useState('medium');
  const [types, setTypes] = useState(['mcq']);
  const [count, setCount] = useState(5);
  const [loading, setLoading] = useState(false);

  function toggleType(t) {
    setTypes(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]);
  }

  async function generate() {
    if (!subject || !topic || !types.length) { toast('Fill all fields', 'error'); return; }
    setLoading(true);
    try {
      const qs = await generateQuestions({ subject, topic, difficulty, types, count });
      onAdd(qs);
    } catch (err) {
      toast(err.message, 'error');
    } finally { setLoading(false); }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ padding: 12, background: 'rgba(83,74,183,0.08)', borderRadius: 10, fontSize: 13, color: 'var(--muted)' }}>
        💡 AI will auto-assign Bloom's level and PO mapping to each generated question.
      </div>
      <div>
        <label className="label">Subject</label>
        <input className="input" value={subject} onChange={e => setSubject(e.target.value)} placeholder="e.g., Engineering Mechanics" />
      </div>
      <div>
        <label className="label">Topic</label>
        <input className="input" value={topic} onChange={e => setTopic(e.target.value)} placeholder="e.g., Newton's Laws of Motion" />
      </div>
      <div>
        <label className="label">Difficulty</label>
        <div style={{ display: 'flex', gap: 6 }}>
          {DIFFICULTIES.map(d => (
            <button key={d} type="button"
              style={{ flex: 1, padding: '8px 4px', borderRadius: 8, border: `2px solid ${difficulty === d ? 'var(--primary)' : 'var(--border)'}`, background: difficulty === d ? 'rgba(83,74,183,0.1)' : 'transparent', cursor: 'pointer', fontSize: 11, fontFamily: 'Syne', fontWeight: 600, color: difficulty === d ? 'var(--primary)' : 'var(--muted)', textTransform: 'capitalize' }}
              onClick={() => setDifficulty(d)}
            >{d}</button>
          ))}
        </div>
      </div>
      <div>
        <label className="label">Question Types</label>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {QUESTION_TYPES.map(t => (
            <button key={t} type="button"
              style={{ padding: '6px 12px', borderRadius: 8, border: `2px solid ${types.includes(t) ? 'var(--primary)' : 'var(--border)'}`, background: types.includes(t) ? 'rgba(83,74,183,0.1)' : 'transparent', cursor: 'pointer', fontFamily: 'Syne', fontWeight: 600, fontSize: 11, color: types.includes(t) ? 'var(--primary)' : 'var(--muted)', textTransform: 'capitalize' }}
              onClick={() => toggleType(t)}
            >{t}</button>
          ))}
        </div>
      </div>
      <div>
        <label className="label">Count: {count} questions</label>
        <Slider min={1} max={20} value={count} onChange={setCount} />
      </div>
      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
        <button className="btn-ghost" onClick={onCancel}>Cancel</button>
        <button className="btn-primary" onClick={generate} disabled={loading} style={{ minWidth: 120, justifyContent: 'center' }}>
          {loading ? <><Spinner size={14} color="white" /> Generating...</> : '🤖 Generate'}
        </button>
      </div>
    </div>
  );
}
