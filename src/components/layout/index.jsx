import { Link, useLocation, useNavigate } from 'react-router-dom';
import useAuthStore from '../../stores/authStore';
import useAppStore from '../../stores/appStore';

const HomeIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9,22 9,12 15,12 15,22"/>
  </svg>
);
const QuizIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="4" y="4" width="16" height="16" rx="2"/><line x1="8" y1="9" x2="16" y2="9"/><line x1="8" y1="13" x2="12" y2="13"/>
  </svg>
);
const TrophyIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M6 9H4.5a2.5 2.5 0 000 5H6"/><path d="M18 9h1.5a2.5 2.5 0 010 5H18"/>
    <path d="M4 22h16M8 22V11.5M16 22V11.5M12 22v-4"/><path d="M6 4h12v7.5a6 6 0 01-12 0V4z"/>
  </svg>
);
const UserIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>
  </svg>
);
const AnalyticsIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
  </svg>
);
const MoonIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
    <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/>
  </svg>
);
const SunIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
    <circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
    <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
  </svg>
);

export function TopBar({ title, back, right }) {
  const navigate = useNavigate();
  return (
    <div style={{
      position: 'sticky', top: 0, zIndex: 40,
      background: 'var(--card)', borderBottom: '1px solid var(--border)',
      padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 12
    }}>
      {back && (
        <button
          onClick={() => navigate(back === true ? -1 : back)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: 20, padding: '4px 8px 4px 0', display: 'flex' }}
        >
          ←
        </button>
      )}
      <h1 style={{ margin: 0, fontSize: 18, flex: 1 }}>{title}</h1>
      {right}
    </div>
  );
}

export function BottomNav({ role }) {
  const location = useLocation();
  const { darkMode, toggleDark } = useAppStore();
  
  const teacherItems = [
    { path: '/teacher', label: 'Home', icon: <HomeIcon /> },
    { path: '/teacher/quizzes', label: 'Quizzes', icon: <QuizIcon /> },
    { path: '/teacher/students', label: 'Students', icon: <UserIcon /> },
    { path: '/teacher/analytics', label: 'Analytics', icon: <AnalyticsIcon /> },
    { path: '/profile', label: 'Profile', icon: <UserIcon /> },
  ];
  
  const studentItems = [
    { path: '/student', label: 'Home', icon: <HomeIcon /> },
    { path: '/student/quizzes', label: 'Quizzes', icon: <QuizIcon /> },
    { path: '/leaderboard', label: 'Board', icon: <TrophyIcon /> },
    { path: '/student/my-teachers', label: 'Teachers', icon: <UserIcon /> },
    { path: '/profile', label: 'Profile', icon: <UserIcon /> },
  ];
  
  const items = role === 'teacher' ? teacherItems : studentItems;
  
  return (
    <nav style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 40,
      background: 'var(--card)', borderTop: '1px solid var(--border)',
      padding: '8px 4px 12px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-around',
    }}>
      {items.map(item => {
        const active = location.pathname === item.path ||
          (item.path !== '/profile' && item.path !== '/student' && item.path !== '/teacher' && location.pathname.startsWith(item.path));
        return (
          <Link key={item.path} to={item.path} className={`nav-item ${active ? 'active' : ''}`}>
            {item.icon}
            <span>{item.label}</span>
          </Link>
        );
      })}
      <button className="nav-item" onClick={toggleDark}>
        {darkMode ? <SunIcon /> : <MoonIcon />}
        <span>{darkMode ? 'Light' : 'Dark'}</span>
      </button>
    </nav>
  );
}

export function PageLayout({ children, role, showBack, title, right }) {
  return (
    <div style={{ minHeight: '100vh', paddingBottom: 80 }}>
      <div className="gradient-mesh" />
      {title && <TopBar title={title} back={showBack} right={right} />}
      <main style={{ padding: '16px 16px 0' }}>
        {children}
      </main>
      <BottomNav role={role} />
    </div>
  );
}
