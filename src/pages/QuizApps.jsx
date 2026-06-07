import { useState } from 'react';
import { PageLayout } from '../components/layout';
import useAuthStore from '../stores/authStore';

const QUIZ_APPS = [
  {
    id: 'kahoot',
    name: 'Kahoot!',
    emoji: '🎮',
    color: '#46178F',
    bg: '#f3eeff',
    description: 'Game-based learning platform with live quizzes, polls and challenges.',
    features: ['Live multiplayer', 'Music & themes', 'Podium results', 'Team mode'],
    bestFor: 'Classroom engagement & fun competitions',
    free: true,
    url: 'https://kahoot.com',
  },
  {
    id: 'quizizz',
    name: 'Quizizz',
    emoji: '⚡',
    color: '#7C3AED',
    bg: '#ede9fe',
    description: 'Self-paced quizzes with memes, avatars and detailed analytics.',
    features: ['Self-paced mode', 'Meme feedback', 'Homework mode', 'AI question gen'],
    bestFor: 'Self-paced practice & homework',
    free: true,
    url: 'https://quizizz.com',
  },
  {
    id: 'mentimeter',
    name: 'Mentimeter',
    emoji: '📊',
    color: '#0D3349',
    bg: '#e8f4f8',
    description: 'Interactive presentations with polls, word clouds and Q&A.',
    features: ['Word clouds', 'Live polls', 'Anonymous Q&A', 'Slide integration'],
    bestFor: 'Presentations & audience interaction',
    free: true,
    url: 'https://mentimeter.com',
  },
  {
    id: 'typeform',
    name: 'Typeform',
    emoji: '📝',
    color: '#262627',
    bg: '#f5f5f5',
    description: 'Beautiful conversational forms and quizzes with high completion rates.',
    features: ['Conversational UI', 'Logic jumps', 'Score outcomes', 'Embeddable'],
    bestFor: 'Assessments & scored quizzes',
    free: true,
    url: 'https://typeform.com',
  },
  {
    id: 'google-forms',
    name: 'Google Forms',
    emoji: '📋',
    color: '#673AB7',
    bg: '#f3e5ff',
    description: 'Free form builder with auto-grading and Google Sheets integration.',
    features: ['Auto-grading', 'Sheets sync', 'Branching', 'Completely free'],
    bestFor: 'Simple tests & data collection',
    free: true,
    url: 'https://forms.google.com',
  },
  {
    id: 'gimkit',
    name: 'Gimkit',
    emoji: '💰',
    color: '#FFD700',
    bg: '#fffbeb',
    description: 'Students earn in-game currency answering questions in various game modes.',
    features: ['In-game economy', '10+ game modes', 'Trust No One', 'Drawing mode'],
    bestFor: 'Gamified test review sessions',
    free: false,
    url: 'https://gimkit.com',
  },
  {
    id: 'blooket',
    name: 'Blooket',
    emoji: '🦔',
    color: '#00A86B',
    bg: '#ecfdf5',
    description: 'Question sets turned into 15+ unique game modes students love.',
    features: ['15+ games', 'Gold Quest', 'Tower Defense', 'Fishing Frenzy'],
    bestFor: 'Fun review games for any subject',
    free: true,
    url: 'https://blooket.com',
  },
  {
    id: 'socrative',
    name: 'Socrative',
    emoji: '🚀',
    color: '#E8144D',
    bg: '#fff0f3',
    description: 'Real-time assessment tool with space-race and exit tickets.',
    features: ['Space Race', 'Exit tickets', 'Reports PDF', 'Team activity'],
    bestFor: 'Formative assessment & exit tickets',
    free: true,
    url: 'https://socrative.com',
  },
  {
    id: 'quizlet',
    name: 'Quizlet',
    emoji: '🃏',
    color: '#4255FF',
    bg: '#eef0ff',
    description: 'Flashcard-based learning with study modes and practice tests.',
    features: ['Flashcards', 'Learn mode', 'Match game', 'AI explanations'],
    bestFor: 'Vocabulary & term memorization',
    free: true,
    url: 'https://quizlet.com',
  },
  {
    id: 'nearpod',
    name: 'Nearpod',
    emoji: '🎯',
    color: '#FF6B35',
    bg: '#fff4ef',
    description: 'Interactive lessons with embedded quizzes, VR and simulations.',
    features: ['VR field trips', 'Draw It', '3D models', 'Video embed'],
    bestFor: 'Rich interactive lessons',
    free: true,
    url: 'https://nearpod.com',
  },
  {
    id: 'formative',
    name: 'Formative',
    emoji: '✏️',
    color: '#00B4D8',
    bg: '#e0f7fa',
    description: 'Real-time formative assessment with live student response tracking.',
    features: ['Live responses', 'Draw answers', 'Audio responses', 'Standards align'],
    bestFor: 'Real-time formative feedback',
    free: true,
    url: 'https://goformative.com',
  },
  {
    id: 'polleverywhere',
    name: 'Poll Everywhere',
    emoji: '🗳️',
    color: '#1A73E8',
    bg: '#e8f0fe',
    description: 'Live polls and Q&A via SMS or web, great for large audiences.',
    features: ['SMS voting', 'Clickable image', 'Competition', 'Presentation embed'],
    bestFor: 'Large lecture halls & seminars',
    free: true,
    url: 'https://polleverywhere.com',
  },
  {
    id: 'wooclap',
    name: 'Wooclap',
    emoji: '🌟',
    color: '#FF4081',
    bg: '#fce4ec',
    description: 'Audience interaction platform for higher ed and corporate training.',
    features: ['Brainstorm', 'Ranking', 'Find on image', 'Slides add-in'],
    bestFor: 'University lectures & training',
    free: true,
    url: 'https://wooclap.com',
  },
  {
    id: 'classkick',
    name: 'Classkick',
    emoji: '🙋',
    color: '#FF7043',
    bg: '#fff3e0',
    description: 'Students ask for help anonymously; teachers see all work in real time.',
    features: ['Anonymous help', 'Live view all', 'Sticker feedback', 'Peer assist'],
    bestFor: 'Independent practice with live support',
    free: true,
    url: 'https://classkick.com',
  },
  {
    id: 'padlet',
    name: 'Padlet',
    emoji: '📌',
    color: '#FF6B6B',
    bg: '#fff0f0',
    description: 'Virtual bulletin board for collaborative activities and exit tickets.',
    features: ['Collaborative walls', 'Shelf/Grid/Stream', 'Reactions', 'Embed anywhere'],
    bestFor: 'Collaborative brainstorming & reflection',
    free: true,
    url: 'https://padlet.com',
  },
];

const CATEGORIES = ['All', 'Game-based', 'Formative', 'Collaborative', 'Presentation'];

const CATEGORY_MAP = {
  'Game-based': ['kahoot', 'quizizz', 'gimkit', 'blooket', 'socrative'],
  'Formative': ['google-forms', 'typeform', 'formative', 'classkick', 'socrative'],
  'Collaborative': ['padlet', 'wooclap', 'polleverywhere', 'mentimeter'],
  'Presentation': ['mentimeter', 'nearpod', 'wooclap', 'polleverywhere'],
};

export default function QuizApps() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [freeOnly, setFreeOnly] = useState(false);

  const filtered = QUIZ_APPS.filter(app => {
    const matchSearch = app.name.toLowerCase().includes(search.toLowerCase()) ||
      app.description.toLowerCase().includes(search.toLowerCase());
    const matchCat = category === 'All' || CATEGORY_MAP[category]?.includes(app.id);
    const matchFree = !freeOnly || app.free;
    return matchSearch && matchCat && matchFree;
  });

  return (
    <PageLayout title="Quiz Apps" role={profile?.role}>
      <div className="space-y-4 max-w-2xl mx-auto">

        {/* Header */}
        <div className="card p-5" style={{ background: 'linear-gradient(135deg, rgba(83,74,183,0.12), rgba(29,158,117,0.08))', border: '1px solid var(--border)' }}>
          <h2 className="font-semibold text-lg">🌐 Explore Quiz Platforms</h2>
          <p className="text-sm text-text-secondary mt-1">15 popular tools to complement your teaching. Click any card to visit.</p>
        </div>

        {/* Filters */}
        <div className="space-y-3">
          <input
            className="input w-full"
            placeholder="🔍 Search apps..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <div className="flex gap-2 flex-wrap items-center">
            {CATEGORIES.map(c => (
              <button key={c} onClick={() => setCategory(c)}
                style={{
                  padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600, fontFamily: 'Syne',
                  border: `2px solid ${category === c ? 'var(--primary)' : 'var(--border)'}`,
                  background: category === c ? 'rgba(83,74,183,0.12)' : 'transparent',
                  color: category === c ? 'var(--primary)' : 'var(--muted)',
                  cursor: 'pointer', transition: 'all 0.15s',
                }}
              >{c}</button>
            ))}
            <button onClick={() => setFreeOnly(f => !f)}
              style={{
                padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600, fontFamily: 'Syne',
                border: `2px solid ${freeOnly ? 'var(--teal)' : 'var(--border)'}`,
                background: freeOnly ? 'rgba(29,158,117,0.12)' : 'transparent',
                color: freeOnly ? 'var(--teal)' : 'var(--muted)',
                cursor: 'pointer', transition: 'all 0.15s', marginLeft: 'auto',
              }}
            >✓ Free Only</button>
          </div>
        </div>

        {/* Count */}
        <p className="text-xs text-text-muted">Showing {filtered.length} of {QUIZ_APPS.length} apps</p>

        {/* App Cards */}
        <div className="space-y-3">
          {filtered.map(app => (
            <a
              key={app.id}
              href={app.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{ textDecoration: 'none', display: 'block' }}
            >
              <div className="card p-4 hover:shadow-md transition-all cursor-pointer"
                style={{ borderLeft: `4px solid ${app.color}` }}
              >
                <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                  {/* Icon */}
                  <div style={{
                    width: 48, height: 48, borderRadius: 12, flexShrink: 0,
                    background: app.bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 24,
                  }}>
                    {app.emoji}
                  </div>

                  {/* Content */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 700, fontSize: 15, fontFamily: 'Syne', color: app.color }}>{app.name}</span>
                      {app.free && (
                        <span style={{ fontSize: 10, fontWeight: 700, background: 'rgba(29,158,117,0.12)', color: 'var(--teal)', borderRadius: 4, padding: '2px 7px' }}>FREE</span>
                      )}
                      {!app.free && (
                        <span style={{ fontSize: 10, fontWeight: 700, background: 'rgba(249,115,22,0.12)', color: '#f97316', borderRadius: 4, padding: '2px 7px' }}>PAID</span>
                      )}
                    </div>
                    <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 3, lineHeight: 1.5 }}>{app.description}</p>

                    {/* Features */}
                    <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 8 }}>
                      {app.features.map(f => (
                        <span key={f} style={{
                          fontSize: 11, padding: '2px 8px', borderRadius: 6,
                          background: app.bg, color: app.color, fontWeight: 600,
                        }}>{f}</span>
                      ))}
                    </div>

                    {/* Best for */}
                    <p style={{ fontSize: 11, color: 'var(--muted)', marginTop: 7 }}>
                      🎯 <strong>Best for:</strong> {app.bestFor}
                    </p>
                  </div>

                  {/* Arrow */}
                  <span style={{ color: 'var(--muted)', fontSize: 18, flexShrink: 0 }}>↗</span>
                </div>
              </div>
            </a>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="card p-10 text-center">
            <p className="text-4xl mb-3">🔍</p>
            <p className="font-semibold">No apps found</p>
            <p className="text-sm text-text-secondary mt-1">Try a different search or category.</p>
          </div>
        )}

        <div className="h-4" />
      </div>
    </PageLayout>
  );
}
