import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import useAuthStore from '../stores/authStore';
import useAppStore from '../stores/appStore';
import { DndContext, closestCenter } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { getQuiz, getQuizByJoinCode, saveAttempt, subscribeLiveSession } from '../services/firestore';
import { calculateScore, formatTime } from '../utils';
import { Spinner, ProgressBar } from '../components/ui';

export default function QuizAttempt() {
  const { quizId, code } = useParams();
  const id = quizId; // route param is :quizId
  const navigate = useNavigate();
  const { profile, user } = useAuthStore();
  const { toast } = useAppStore();
  const [quiz, setQuiz] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(null);
  const [startTime] = useState(Date.now());
  const [submitting, setSubmitting] = useState(false);
  const [liveSession, setLiveSession] = useState(null);
  const timerRef = useRef(null);

  useEffect(() => {
    loadQuiz();
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  async function loadQuiz() {
    try {
      let q;
      if (code) {
        q = await getQuizByJoinCode(code);
      } else {
        q = await getQuiz(id);
      }
      
      if (!q) { toast('Quiz not found', 'error'); navigate(-1); return; }
      
      // Shuffle if enabled
      if (q.shuffleQuestions && q.questions?.length) {
        q = { ...q, questions: [...q.questions].sort(() => Math.random() - 0.5) };
      }
      
      setQuiz(q);
      
      // Start timer
      if (q.timeLimitMinutes) {
        setTimeLeft(q.timeLimitMinutes * 60);
        timerRef.current = setInterval(() => {
          setTimeLeft(prev => {
            if (prev <= 1) { clearInterval(timerRef.current); handleSubmit(q); return 0; }
            return prev - 1;
          });
        }, 1000);
      }
      
      // Subscribe live session
      if (q.isLiveMode) {
        subscribeLiveSession(q.id, (session) => {
          setLiveSession(session);
          if (session?.currentIndex !== undefined) setCurrentIndex(session.currentIndex);
        });
      }
      
      setLoading(false);
    } catch (err) {
      toast('Failed to load quiz', 'error');
      navigate(-1);
    }
  }

  function setAnswer(questionId, value) {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
  }

  async function handleSubmit(quizOverride) {
    const q = quizOverride || quiz;
    if (submitting) return;
    setSubmitting(true);
    
    if (timerRef.current) clearInterval(timerRef.current);
    
    try {
      const timeTaken = Math.round((Date.now() - startTime) / 1000);
      const { total, maxPossible, percentage, details } = calculateScore(
        q.questions, answers, q.negativeMarkingEnabled, q.negativeMarkingValue
      );
      
      const attemptId = await saveAttempt({
        quizId: q.id, quizTitle: q.title,
        userId: user?.uid || profile?.id, userName: profile?.name,
        answers, score: total, maxScore: maxPossible, percentage,
        details, timeTaken, hideResults: q.hideResultsUntilEnd,
        teacherId: q.creatorId,
      });
      
      navigate(`/results/${attemptId}`);
    } catch (err) {
      toast('Failed to submit', 'error');
      setSubmitting(false);
    }
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', flexDirection: 'column', gap: 12 }}>
      <Spinner size={32} />
      <p style={{ color: 'var(--muted)' }}>Loading quiz...</p>
    </div>
  );

  const questions = quiz.questions || [];
  const current = questions[currentIndex];
  const answered = Object.keys(answers).length;

  return (
    <div style={{ minHeight: '100vh', paddingBottom: 20 }}>
      <div className="gradient-mesh" />
      
      {/* Header */}
      <div style={{ background: 'var(--card)', borderBottom: '1px solid var(--border)', padding: '12px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 style={{ margin: 0, fontSize: 16, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{quiz.title}</h2>
          </div>
          {timeLeft !== null && (
            <div style={{ fontFamily: 'JetBrains Mono', fontWeight: 700, fontSize: 18, color: timeLeft < 60 ? 'var(--error)' : timeLeft < 300 ? 'var(--accent)' : 'var(--primary)', flexShrink: 0, marginLeft: 12 }}>
              ⏱ {formatTime(timeLeft)}
            </div>
          )}
          {quiz.isLiveMode && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 12 }}>
              <span className="live-pulse" />
              <span style={{ fontSize: 11, fontFamily: 'Syne', fontWeight: 700, color: 'var(--error)' }}>LIVE</span>
            </div>
          )}
        </div>
        <ProgressBar value={answered} max={questions.length} color="var(--primary)" />
        <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>{answered}/{questions.length} answered</div>
      </div>

      {/* Question Navigation Dots */}
      <div style={{ padding: '12px 20px', display: 'flex', gap: 6, justifyContent: 'center', flexWrap: 'wrap' }}>
        {questions.map((q, i) => (
          <div
            key={q.id}
            className={`question-dot ${i === currentIndex ? 'current' : ''} ${answers[q.id] !== undefined ? 'answered' : ''}`}
            onClick={() => !quiz.isLiveMode && setCurrentIndex(i)}
            style={{ cursor: quiz.isLiveMode ? 'default' : 'pointer' }}
          />
        ))}
      </div>

      {/* Current Question */}
      {current ? (
        <div style={{ padding: '0 16px' }}>
          <div className="card" style={{ padding: 20, marginBottom: 16 }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 16 }}>
              <span style={{ background: 'var(--primary)', color: 'white', borderRadius: 8, padding: '2px 10px', fontFamily: 'Syne', fontWeight: 700, fontSize: 13, flexShrink: 0 }}>
                Q{currentIndex + 1}
              </span>
              <span style={{ fontSize: 13, color: 'var(--muted)', fontFamily: 'Syne', fontWeight: 600 }}>{current.type?.toUpperCase()} · {current.points} pts</span>
            </div>
            <p style={{ fontSize: 16, lineHeight: 1.6, margin: 0, fontWeight: 500 }}>{current.question}</p>
          </div>

          {/* Answer area by type */}
          <QuestionInput
            question={current}
            value={answers[current.id]}
            onChange={val => setAnswer(current.id, val)}
          />
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--muted)' }}>Waiting for teacher...</div>
      )}

      {/* Navigation */}
      <div style={{ padding: '16px', display: 'flex', gap: 10, alignItems: 'center' }}>
        <button
          className="btn-ghost"
          disabled={currentIndex === 0 || quiz.isLiveMode}
          onClick={() => setCurrentIndex(i => Math.max(0, i - 1))}
          style={{ flex: 1, justifyContent: 'center' }}
        >
          ← Previous
        </button>
        
        {currentIndex < questions.length - 1 ? (
          <button
            className="btn-primary"
            disabled={quiz.isLiveMode}
            onClick={() => setCurrentIndex(i => i + 1)}
            style={{ flex: 1, justifyContent: 'center' }}
          >
            Next →
          </button>
        ) : (
          <button
            className="btn-primary"
            onClick={() => handleSubmit()}
            disabled={submitting}
            style={{ flex: 1, justifyContent: 'center', background: 'var(--teal)' }}
          >
            {submitting ? <><Spinner size={14} color="white" /> Submitting...</> : '✓ Submit Quiz'}
          </button>
        )}
      </div>
    </div>
  );
}

function QuestionInput({ question, value, onChange }) {
  switch (question.type) {
    case 'mcq':
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {question.options?.map((opt, i) => (
            <div
              key={i}
              className={`option-card ${value === opt ? 'selected' : ''}`}
              onClick={() => onChange(opt)}
            >
              <div style={{
                width: 32, height: 32, borderRadius: 8, border: `2px solid ${value === opt ? 'var(--primary)' : 'var(--border)'}`,
                background: value === opt ? 'var(--primary)' : 'transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'Syne', fontWeight: 700, fontSize: 13,
                color: value === opt ? 'white' : 'var(--muted)', flexShrink: 0
              }}>
                {String.fromCharCode(65 + i)}
              </div>
              <span style={{ fontSize: 15, lineHeight: 1.4 }}>{opt}</span>
            </div>
          ))}
        </div>
      );

    case 'fill':
      return (
        <input
          className="input"
          value={value || ''}
          onChange={e => onChange(e.target.value)}
          placeholder="Type your answer..."
          style={{ fontSize: 16, padding: '14px 16px' }}
        />
      );

    case 'qna':
      return (
        <textarea
          className="input"
          value={value || ''}
          onChange={e => onChange(e.target.value)}
          placeholder="Write your answer here..."
          rows={6}
          style={{ resize: 'vertical', fontSize: 15, lineHeight: 1.6 }}
        />
      );

    case 'code':
      return (
        <textarea
          className="code-editor"
          value={value || ''}
          onChange={e => onChange(e.target.value)}
          placeholder="// Write your code here..."
          rows={10}
        />
      );

    case 'puzzle':
      return <PuzzleInput question={question} value={value} onChange={onChange} />;

    default:
      return null;
  }
}

function SortablePuzzleItem({ id, text, index }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = { transform: CSS.Transform.toString(transform), transition };
  
  return (
    <div ref={setNodeRef} style={style} className={`puzzle-item ${isDragging ? 'dragging' : ''}`} {...attributes} {...listeners}>
      <span style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 13, color: 'var(--muted)', width: 24 }}>{index + 1}.</span>
      <span style={{ flex: 1, fontSize: 15 }}>{text}</span>
      <span style={{ color: 'var(--muted)', fontSize: 18 }}>⠿</span>
    </div>
  );
}

function PuzzleInput({ question, value, onChange }) {
  const initialItems = question.options || [];
  const [items, setItems] = useState(value ? value.split(',').map(s => s.trim()) : initialItems);

  function handleDragEnd(event) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = items.indexOf(active.id);
    const newIndex = items.indexOf(over.id);
    const newItems = arrayMove(items, oldIndex, newIndex);
    setItems(newItems);
    onChange(newItems.join(','));
  }

  return (
    <div>
      <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 12 }}>Drag to arrange in the correct order ⬆⬇</p>
      <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={items} strategy={verticalListSortingStrategy}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {items.map((item, i) => (
              <SortablePuzzleItem key={item} id={item} text={item} index={i} />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}
