import { useState, useEffect } from 'react';
import useAuthStore from '../stores/authStore';
import useAppStore from '../stores/appStore';
import { getAttemptsByStudent, getTeacherQuizzes, updateUserProfile } from '../services/firestore';
import { PageLayout } from '../components/layout';
import { Toggle, Spinner } from '../components/ui';
import { ACTIVE_PROVIDER, PROVIDERS } from '../services/ai';

export default function Profile() {
  const { user, profile, updateProfile, logout } = useAuthStore();
  const { darkMode, toggleDark, toast } = useAppStore();
  const [name, setName] = useState(profile?.name || '');
  const [saving, setSaving] = useState(false);
  const [stats, setStats] = useState(null);
  const [copied, setCopied] = useState(false);
  const isTeacher = profile?.role === 'teacher';

  // Auto-generate teacherCode if missing
  useEffect(() => {
    if (isTeacher && user && !profile?.teacherCode) {
      const code = 'TC' + Math.random().toString(36).slice(2, 8).toUpperCase();
      updateUserProfile(user.uid, { teacherCode: code })
        .then(() => updateProfile({ teacherCode: code }))
        .catch(() => {});
    }
  }, [isTeacher, user, profile]);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      try {
        if (isTeacher) {
          const quizzes = await getTeacherQuizzes(user.uid);
          setStats({ quizzes: quizzes.length, published: quizzes.filter(q => q.status === 'published').length });
        } else {
          const attempts = await getAttemptsByStudent(user.uid);
          setStats({ attempts: attempts.length, totalPoints: Math.round(attempts.reduce((s, a) => s + (a.score || 0), 0)) });
        }
      } catch {}
    };
    load();
  }, [user, isTeacher]);

  const handleSaveName = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await updateProfile({ name: name.trim() });
      toast('Profile updated ✓', 'success');
    } catch { toast('Failed to update', 'error'); }
    setSaving(false);
  };

  const copyCode = () => {
    navigator.clipboard.writeText(profile?.teacherCode || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const activeProviderName = PROVIDERS[ACTIVE_PROVIDER]?.name || ACTIVE_PROVIDER;

  return (
    <PageLayout title="Profile" role={profile?.role}>
      <div style={{ maxWidth: 480, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 14 }}>

        {/* Avatar */}
        <div className="card" style={{ padding: 24, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'linear-gradient(135deg,var(--primary),var(--teal))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 30, fontWeight: 800, color: 'white', fontFamily: 'Syne' }}>
            {(profile?.name || '?')[0].toUpperCase()}
          </div>
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontWeight: 700, fontSize: 18, fontFamily: 'Syne', margin: 0 }}>{profile?.name}</p>
            <p style={{ fontSize: 13, color: 'var(--muted)', margin: '4px 0' }}>{user?.email}</p>
            <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 6, background: 'rgba(83,74,183,0.1)', color: 'var(--primary)', textTransform: 'capitalize' }}>{profile?.role}</span>
          </div>
          {/* Academic details */}
          {profile?.role === 'student' && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center', marginTop: 4 }}>
              {profile?.usn && <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 6, background: 'var(--surface)', color: 'var(--muted)' }}>📋 {profile.usn}</span>}
              {profile?.department && <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 6, background: 'var(--surface)', color: 'var(--muted)' }}>🏫 {profile.department}</span>}
              {profile?.batch && <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 6, background: 'var(--surface)', color: 'var(--muted)' }}>📅 {profile.batch}</span>}
              {profile?.academicYear && <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 6, background: 'var(--surface)', color: 'var(--muted)' }}>🎓 {profile.academicYear}</span>}
            </div>
          )}
          {profile?.role === 'teacher' && profile?.department && (
            <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 6, background: 'var(--surface)', color: 'var(--muted)' }}>🏫 {profile.department}</span>
          )}
        </div>

        {/* Stats */}
        {stats && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {isTeacher ? (
              <>
                <div className="card" style={{ padding: 16, textAlign: 'center' }}>
                  <div style={{ fontSize: 22 }}>📝</div>
                  <div style={{ fontWeight: 800, fontSize: 22, fontFamily: 'Syne', color: 'var(--primary)' }}>{stats.quizzes}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)' }}>Quizzes Created</div>
                </div>
                <div className="card" style={{ padding: 16, textAlign: 'center' }}>
                  <div style={{ fontSize: 22 }}>🚀</div>
                  <div style={{ fontWeight: 800, fontSize: 22, fontFamily: 'Syne', color: 'var(--teal)' }}>{stats.published}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)' }}>Published</div>
                </div>
              </>
            ) : (
              <>
                <div className="card" style={{ padding: 16, textAlign: 'center' }}>
                  <div style={{ fontSize: 22 }}>📊</div>
                  <div style={{ fontWeight: 800, fontSize: 22, fontFamily: 'Syne', color: 'var(--primary)' }}>{stats.attempts}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)' }}>Quizzes Taken</div>
                </div>
                <div className="card" style={{ padding: 16, textAlign: 'center' }}>
                  <div style={{ fontSize: 22 }}>⭐</div>
                  <div style={{ fontWeight: 800, fontSize: 22, fontFamily: 'Syne', color: 'var(--teal)' }}>{stats.totalPoints}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)' }}>Total Points</div>
                </div>
              </>
            )}
          </div>
        )}

        {/* Teacher Code */}
        {isTeacher && (
          <div className="card" style={{ padding: 18 }}>
            <h3 style={{ fontFamily: 'Syne', fontWeight: 800, margin: '0 0 6px', fontSize: 15 }}>🔑 Your Teacher Code</h3>
            <p style={{ fontSize: 12, color: 'var(--muted)', margin: '0 0 12px' }}>Share with students to connect</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--surface)', borderRadius: 10, padding: '12px 16px' }}>
              <span style={{ fontFamily: 'JetBrains Mono', fontWeight: 800, fontSize: 22, color: 'var(--primary)', letterSpacing: 4, flex: 1 }}>
                {profile?.teacherCode || 'Generating...'}
              </span>
              <button onClick={copyCode} className="btn-primary" style={{ padding: '7px 14px', fontSize: 12 }}>
                {copied ? '✓ Copied' : 'Copy'}
              </button>
            </div>
          </div>
        )}

        {/* Edit name */}
        <div className="card" style={{ padding: 18 }}>
          <h3 style={{ fontFamily: 'Syne', fontWeight: 700, margin: '0 0 12px', fontSize: 15 }}>Display Name</h3>
          <div style={{ display: 'flex', gap: 8 }}>
            <input className="input" style={{ flex: 1 }} value={name} onChange={e => setName(e.target.value)} placeholder="Your name" />
            <button onClick={handleSaveName} disabled={saving} className="btn-primary" style={{ padding: '10px 16px' }}>
              {saving ? <Spinner size={14} color="white" /> : 'Save'}
            </button>
          </div>
        </div>

        {/* Dark mode */}
        <div className="card" style={{ padding: 18, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <p style={{ fontWeight: 700, margin: 0, fontSize: 15 }}>Dark Mode</p>
            <p style={{ fontSize: 12, color: 'var(--muted)', margin: '2px 0 0' }}>Switch theme</p>
          </div>
          <Toggle checked={darkMode} onChange={toggleDark} />
        </div>

        {/* AI Provider info */}
        <div className="card" style={{ padding: 18 }}>
          <h3 style={{ fontFamily: 'Syne', fontWeight: 700, margin: '0 0 8px', fontSize: 15 }}>🤖 AI Provider</h3>
          <div style={{ padding: '10px 14px', background: 'rgba(83,74,183,0.08)', borderRadius: 10, fontSize: 13 }}>
            <span style={{ fontWeight: 700, color: 'var(--primary)' }}>{activeProviderName}</span>
            <span style={{ color: 'var(--muted)', marginLeft: 8 }}>— configured by administrator</span>
          </div>
          <p style={{ fontSize: 11, color: 'var(--muted)', marginTop: 8, margin: '8px 0 0' }}>
            🔒 API keys are managed securely in environment variables.
          </p>
        </div>

        {/* Logout */}
        <div className="card" style={{ padding: 18 }}>
          <button onClick={logout} style={{ width: '100%', padding: '12px', borderRadius: 12, background: '#ef4444', color: 'white', border: 'none', fontFamily: 'Syne', fontWeight: 700, fontSize: 15, cursor: 'pointer' }}>
            Logout
          </button>
        </div>

        <div style={{ height: 20 }} />
      </div>
    </PageLayout>
  );
}
