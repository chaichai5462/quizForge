import { useState, useEffect } from 'react';
import useAppStore from '../../stores/appStore';

// ── Toast Container ────────────────────────────────────────────────────────
export function ToastContainer() {
  const toasts = useAppStore(s => s.toasts);
  const icons = { success: '✅', error: '❌', info: 'ℹ️', warning: '⚠️' };
  
  return (
    <div style={{ position: 'fixed', bottom: 80, left: '50%', transform: 'translateX(-50%)', zIndex: 100, display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center' }}>
      {toasts.map(t => (
        <div key={t.id} className="toast">
          <span>{icons[t.type] || 'ℹ️'}</span>
          <span>{t.message}</span>
        </div>
      ))}
    </div>
  );
}

// ── Modal ──────────────────────────────────────────────────────────────────
export function Modal({ isOpen, onClose, title, children, maxWidth = 560 }) {
  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);
  
  if (!isOpen) return null;
  
  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-content" style={{ maxWidth }}>
        {title && (
          <div style={{ padding: '20px 24px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h3 style={{ margin: 0, fontSize: 18 }}>{title}</h3>
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: 'var(--muted)' }}>✕</button>
          </div>
        )}
        <div style={{ padding: 24 }}>{children}</div>
      </div>
    </div>
  );
}

// ── Confirm Dialog ─────────────────────────────────────────────────────────
export function ConfirmDialog({ isOpen, onClose, onConfirm, title, message, danger }) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} maxWidth={420}>
      <p style={{ color: 'var(--muted)', marginBottom: 24, lineHeight: 1.6 }}>{message}</p>
      <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
        <button className="btn-ghost" onClick={onClose}>Cancel</button>
        <button className={danger ? 'btn-danger' : 'btn-primary'} onClick={() => { onConfirm(); onClose(); }}>
          Confirm
        </button>
      </div>
    </Modal>
  );
}

// ── Spinner ────────────────────────────────────────────────────────────────
export function Spinner({ size = 20, color = 'var(--primary)' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className="animate-spin">
      <circle cx="12" cy="12" r="10" stroke={color} strokeWidth="3" strokeDasharray="40 20" />
    </svg>
  );
}

// ── Skeleton ───────────────────────────────────────────────────────────────
export function SkeletonCard() {
  return (
    <div className="card" style={{ padding: 20 }}>
      <div className="skeleton" style={{ height: 18, width: '60%', marginBottom: 12 }} />
      <div className="skeleton" style={{ height: 14, width: '80%', marginBottom: 8 }} />
      <div className="skeleton" style={{ height: 14, width: '40%' }} />
    </div>
  );
}

// ── Empty State ────────────────────────────────────────────────────────────
export function EmptyState({ icon, title, message, action }) {
  return (
    <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--muted)' }}>
      <div style={{ fontSize: 48, marginBottom: 12 }}>{icon}</div>
      <h3 style={{ color: 'var(--text)', marginBottom: 8, fontSize: 18 }}>{title}</h3>
      <p style={{ marginBottom: 20, lineHeight: 1.6, maxWidth: 300, margin: '0 auto 20px' }}>{message}</p>
      {action}
    </div>
  );
}

// ── Toggle ─────────────────────────────────────────────────────────────────
export function Toggle({ value, onChange }) {
  return (
    <button
      className={`toggle ${value ? 'on' : ''}`}
      onClick={() => onChange(!value)}
      type="button"
    />
  );
}

// ── Badge ──────────────────────────────────────────────────────────────────
export function StatusBadge({ status }) {
  const map = {
    draft: { cls: 'badge-gray', label: 'Draft' },
    published: { cls: 'badge-teal', label: 'Published' },
    active: { cls: 'badge-accent', label: 'Live' },
    completed: { cls: 'badge-primary', label: 'Completed' },
    pending: { cls: 'badge-accent', label: 'Pending' },
    accepted: { cls: 'badge-teal', label: 'Accepted' },
    rejected: { cls: 'badge-error', label: 'Rejected' },
  };
  const { cls, label } = map[status] || { cls: 'badge-gray', label: status };
  return <span className={`badge ${cls}`}>{label}</span>;
}

// ── Difficulty Badge ───────────────────────────────────────────────────────
export function DifficultyBadge({ level }) {
  const map = {
    easy: { cls: 'badge-teal', label: '🟢 Easy' },
    medium: { cls: 'badge-accent', label: '🟡 Medium' },
    hard: { cls: 'badge-primary', label: '🔴 Hard' },
    expert: { cls: 'badge-error', label: '💀 Expert' },
  };
  const { cls, label } = map[level] || { cls: 'badge-gray', label: level };
  return <span className={`badge ${cls}`}>{label}</span>;
}

// ── Progress Bar ───────────────────────────────────────────────────────────
export function ProgressBar({ value, max, color }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  const barColor = color || (pct >= 70 ? '#1D9E75' : pct >= 50 ? '#F97316' : '#EF4444');
  return (
    <div className="progress-bar">
      <div className="progress-fill" style={{ width: `${pct}%`, background: barColor }} />
    </div>
  );
}

// ── Score Circle ───────────────────────────────────────────────────────────
export function ScoreCircle({ percentage, size = 120 }) {
  const radius = (size - 16) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;
  const color = percentage >= 70 ? '#1D9E75' : percentage >= 50 ? '#F97316' : '#EF4444';
  
  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke="var(--border)" strokeWidth="8" />
        <circle
          cx={size/2} cy={size/2} r={radius} fill="none"
          stroke={color} strokeWidth="8"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 1s cubic-bezier(0.34,1.56,0.64,1)' }}
        />
      </svg>
      <div style={{
        position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center'
      }}>
        <span style={{ fontSize: size * 0.22, fontWeight: 800, fontFamily: 'Syne', color }}>{percentage}%</span>
      </div>
    </div>
  );
}

// ── Type Icon ──────────────────────────────────────────────────────────────
export function TypeIcon({ type }) {
  const icons = { mcq: '⊙', fill: '▢', qna: '💬', code: '</>', puzzle: '🧩' };
  const colors = { mcq: 'var(--primary)', fill: 'var(--teal)', qna: 'var(--accent)', code: '#8B5CF6', puzzle: '#EC4899' };
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      width: 28, height: 28, borderRadius: 7, fontSize: 12, fontWeight: 700, fontFamily: 'Syne',
      background: colors[type] ? `${colors[type]}20` : 'var(--border)',
      color: colors[type] || 'var(--muted)', flexShrink: 0,
    }}>
      {icons[type] || '?'}
    </span>
  );
}

// ── Stats Card ─────────────────────────────────────────────────────────────
export function StatCard({ icon, label, value, color, sub }) {
  return (
    <div className="stat-card">
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
        <span style={{ fontSize: 28 }}>{icon}</span>
        {sub && <span className="badge badge-primary">{sub}</span>}
      </div>
      <div style={{ fontSize: 32, fontWeight: 800, fontFamily: 'Syne', color: color || 'var(--text)', marginBottom: 4 }}>
        {value}
      </div>
      <div style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 500 }}>{label}</div>
    </div>
  );
}

// ── Slider ─────────────────────────────────────────────────────────────────
export function Slider({ min, max, value, onChange, step = 1 }) {
  return (
    <input
      type="range"
      min={min} max={max} step={step}
      value={value}
      onChange={e => onChange(Number(e.target.value))}
      style={{ width: '100%', accentColor: 'var(--primary)', height: 4, cursor: 'pointer' }}
    />
  );
}
