import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getQuizByJoinCode } from '../services/firestore';
import { Spinner } from '../components/ui';

export default function JoinQuiz() {
  const { code } = useParams();
  const navigate = useNavigate();
  const [error, setError] = useState('');

  useEffect(() => {
    const resolve = async () => {
      try {
        const quiz = await getQuizByJoinCode(code?.toUpperCase());
        if (!quiz) { setError('Quiz not found for that code.'); return; }
        navigate(`/attempt/${quiz.id}`, { replace: true });
      } catch {
        setError('Failed to look up quiz. Please try again.');
      }
    };
    if (code) resolve();
  }, [code, navigate]);

  if (error) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-6">
      <span className="text-5xl">🔍</span>
      <p className="font-semibold text-lg text-red-500">{error}</p>
      <button onClick={() => navigate('/')} className="btn-primary px-6">Go Home</button>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4">
      <Spinner size="lg" />
      <p className="text-text-secondary">Finding quiz...</p>
    </div>
  );
}
