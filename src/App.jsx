import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import useAuthStore from './stores/authStore';
import useAppStore from './stores/appStore';
import { ToastContainer, Spinner } from './components/ui';

// Pages
import { LoginPage, SignupPage } from './pages/Auth';
import { TeacherDashboard, TeacherQuizList } from './pages/TeacherDashboard';
import QuizBuilder from './pages/QuizBuilder';
import { StudentDashboard, StudentQuizList, FindTeachers } from './pages/StudentDashboard';
import QuizAttempt from './pages/QuizAttempt';
import Results from './pages/Results';
import { GlobalLeaderboard as Leaderboard, QuizLeaderboard } from './pages/Leaderboard';
import { TeacherAnalytics as Analytics, StudentRequests } from './pages/Analytics';
import { LiveTeacherControl as LiveQuiz } from './pages/LiveQuiz';
import Profile from './pages/Profile';
import Crossword from './pages/Crossword';
import JoinQuiz from './pages/JoinQuiz';
import QuizApps from './pages/QuizApps';
import StudentsConnected from './pages/StudentsConnected';
import MyTeachers from './pages/MyTeachers';
import ViewQuiz from './pages/ViewQuiz';

function AuthGuard({ children, requireRole }) {
  const { user, profile, loading } = useAuthStore();
  const location = useLocation();

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center text-white text-xl font-bold">Q</div>
        <Spinner size="lg" />
      </div>
    </div>
  );

  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;

  if (requireRole && profile?.role && profile.role !== requireRole) {
    return <Navigate to="/" replace />;
  }

  return children;
}

function RoleRouter() {
  const { profile } = useAuthStore();
  if (profile?.role === 'teacher') return <Navigate to="/teacher" replace />;
  return <Navigate to="/student" replace />;
}

function AppRoutes() {
  const { user, profile } = useAuthStore();

  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={user ? <RoleRouter /> : <LoginPage />} />
      <Route path="/signup" element={user ? <RoleRouter /> : <SignupPage />} />

      {/* Root redirect */}
      <Route path="/" element={<AuthGuard><RoleRouter /></AuthGuard>} />

      {/* Join by code */}
      <Route path="/quiz/join/:code" element={<AuthGuard><JoinQuiz /></AuthGuard>} />

      {/* Teacher routes */}
      <Route path="/teacher" element={<AuthGuard requireRole="teacher"><TeacherDashboard /></AuthGuard>} />
      <Route path="/teacher/quizzes" element={<AuthGuard requireRole="teacher"><TeacherQuizList /></AuthGuard>} />
      <Route path="/teacher/quiz/new" element={<AuthGuard requireRole="teacher"><QuizBuilder /></AuthGuard>} />
      <Route path="/teacher/quiz/:quizId/edit" element={<AuthGuard requireRole="teacher"><QuizBuilder /></AuthGuard>} />
      <Route path="/teacher/quiz/:quizId/view" element={<AuthGuard requireRole="teacher"><ViewQuiz /></AuthGuard>} />
      <Route path="/teacher/quiz/:quizId/live" element={<AuthGuard requireRole="teacher"><LiveQuiz /></AuthGuard>} />
      <Route path="/teacher/analytics" element={<AuthGuard requireRole="teacher"><Analytics /></AuthGuard>} />
      <Route path="/teacher/requests" element={<AuthGuard requireRole="teacher"><StudentRequests /></AuthGuard>} />

      {/* Student routes */}
      <Route path="/student" element={<AuthGuard requireRole="student"><StudentDashboard /></AuthGuard>} />
      <Route path="/student/quizzes" element={<AuthGuard requireRole="student"><StudentQuizList /></AuthGuard>} />
      <Route path="/student/find-teachers" element={<AuthGuard requireRole="student"><FindTeachers /></AuthGuard>} />
      <Route path="/student/my-teachers" element={<AuthGuard requireRole="student"><MyTeachers /></AuthGuard>} />

      {/* Shared routes */}
      <Route path="/attempt/:quizId" element={<AuthGuard><QuizAttempt /></AuthGuard>} />
      <Route path="/results/:attemptId" element={<AuthGuard><Results /></AuthGuard>} />
      <Route path="/leaderboard" element={<AuthGuard><Leaderboard /></AuthGuard>} />
      <Route path="/leaderboard/:quizId" element={<AuthGuard><QuizLeaderboard /></AuthGuard>} />
      <Route path="/profile" element={<AuthGuard><Profile /></AuthGuard>} />
      <Route path="/crossword" element={<AuthGuard><Crossword /></AuthGuard>} />
      <Route path="/quiz-apps" element={<AuthGuard><QuizApps /></AuthGuard>} />
      <Route path="/teacher/students" element={<AuthGuard requireRole="teacher"><StudentsConnected /></AuthGuard>} />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function AppInit() {
  const { init } = useAuthStore();
  const { initDark } = useAppStore();

  useEffect(() => {
    initDark();
    const unsub = init();
    return () => unsub?.();
  }, []);

  return (
    <>
      <AppRoutes />
      <ToastContainer />
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppInit />
    </BrowserRouter>
  );
}
