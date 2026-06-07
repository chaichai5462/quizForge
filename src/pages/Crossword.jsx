import { useState, useRef, useEffect } from 'react';
import { generateCrosswordClues } from '../services/ai';
import { buildCrossword } from '../utils';
import { PageLayout } from '../components/layout';
import { Spinner } from '../components/ui';
import useAppStore from '../stores/appStore';
import useAuthStore from '../stores/authStore';

export default function Crossword() {
  const { toast } = useAppStore();
  const { profile } = useAuthStore();
  const [topic, setTopic] = useState('');
  const [loading, setLoading] = useState(false);
  const [puzzle, setPuzzle] = useState(null);
  const [cells, setCells] = useState({});   // key: "row-col" → letter typed
  const [revealed, setRevealed] = useState(false);
  const [selected, setSelected] = useState(null); // { row, col }
  const [direction, setDirection] = useState('across');
  const inputRefs = useRef({});

  // Focus selected cell
  useEffect(() => {
    if (selected) {
      const ref = inputRefs.current[`${selected.row}-${selected.col}`];
      if (ref) ref.focus();
    }
  }, [selected]);

  const generate = async () => {
    if (!topic.trim()) return;
    setLoading(true);
    setPuzzle(null);
    setCells({});
    setRevealed(false);
    setSelected(null);
    try {
      const pairs = await generateCrosswordClues(topic.trim());
      if (!pairs || pairs.length === 0) throw new Error('No clues returned');
      const result = buildCrossword(pairs);
      if (!result || !result.cells || result.cells.length === 0) throw new Error('Grid build failed');

      // Build clue lists
      const across = result.words
        .filter(w => w.horizontal)
        .map(w => ({ number: w.number, clue: w.clue, answer: w.answer }))
        .sort((a, b) => a.number - b.number);
      const down = result.words
        .filter(w => !w.horizontal)
        .map(w => ({ number: w.number, clue: w.clue, answer: w.answer }))
        .sort((a, b) => a.number - b.number);

      setPuzzle({ grid: result.grid, words: result.words, cells: result.cells, clues: { across, down } });
    } catch (e) {
      console.error(e);
      toast('Could not generate crossword. Make sure your API key is set in Profile, then try again.', 'error');
    }
    setLoading(false);
  };

  const getLetter = (row, col) => {
    if (!puzzle || !puzzle.grid[row]) return null;
    return puzzle.grid[row][col] ?? null;
  };

  const getWordNum = (row, col) => {
    if (!puzzle) return null;
    const w = puzzle.words.find(w => w.row === row && w.col === col);
    return w ? w.number : null;
  };

  const getHighlightedCells = () => {
    if (!selected || !puzzle) return new Set();
    const set = new Set();
    puzzle.words.forEach(w => {
      const sameDir = direction === 'across' ? w.horizontal : !w.horizontal;
      if (!sameDir) return;
      // Check if selected cell is inside this word
      const inWord = w.horizontal
        ? w.row === selected.row && selected.col >= w.col && selected.col < w.col + w.answer.length
        : w.col === selected.col && selected.row >= w.row && selected.row < w.row + w.answer.length;
      if (inWord) {
        for (let i = 0; i < w.answer.length; i++) {
          const r = w.horizontal ? w.row : w.row + i;
          const c = w.horizontal ? w.col + i : w.col;
          set.add(`${r}-${c}`);
        }
      }
    });
    return set;
  };

  const handleCellClick = (row, col) => {
    if (selected && selected.row === row && selected.col === col) {
      setDirection(d => d === 'across' ? 'down' : 'across');
    } else {
      setSelected({ row, col });
    }
  };

  const moveNext = (row, col) => {
    if (direction === 'across') {
      if (getLetter(row, col + 1) !== null) setSelected({ row, col: col + 1 });
    } else {
      if (getLetter(row + 1, col) !== null) setSelected({ row: row + 1, col });
    }
  };

  const movePrev = (row, col) => {
    if (direction === 'across') {
      if (col > 0 && getLetter(row, col - 1) !== null) setSelected({ row, col: col - 1 });
    } else {
      if (row > 0 && getLetter(row - 1, col) !== null) setSelected({ row: row - 1, col });
    }
  };

  const handleKeyDown = (e, row, col) => {
    if (e.key === 'Backspace') {
      e.preventDefault();
      const key = `${row}-${col}`;
      if (cells[key]) {
        setCells(prev => ({ ...prev, [key]: '' }));
      } else {
        movePrev(row, col);
      }
    } else if (e.key === 'ArrowRight') { e.preventDefault(); if (getLetter(row, col+1) !== null) setSelected({row, col: col+1}); }
    else if (e.key === 'ArrowLeft')  { e.preventDefault(); if (getLetter(row, col-1) !== null) setSelected({row, col: col-1}); }
    else if (e.key === 'ArrowDown')  { e.preventDefault(); if (getLetter(row+1, col) !== null) setSelected({row: row+1, col}); }
    else if (e.key === 'ArrowUp')    { e.preventDefault(); if (getLetter(row-1, col) !== null) setSelected({row: row-1, col}); }
    else if (e.key === 'Tab')        { e.preventDefault(); setDirection(d => d === 'across' ? 'down' : 'across'); }
  };

  const handleChange = (e, row, col) => {
    const val = e.target.value.toUpperCase().replace(/[^A-Z]/g, '');
    const letter = val.slice(-1);
    setCells(prev => ({ ...prev, [`${row}-${col}`]: letter }));
    if (letter) moveNext(row, col);
  };

  const revealAll = () => {
    const correct = {};
    puzzle.cells.forEach(c => { correct[`${c.row}-${c.col}`] = c.letter; });
    setCells(correct);
    setRevealed(true);
  };

  const isComplete = () => {
    if (!puzzle) return false;
    return puzzle.cells.every(c => cells[`${c.row}-${c.col}`] === c.letter);
  };

  const highlighted = puzzle ? getHighlightedCells() : new Set();
  const gridRows = puzzle ? puzzle.grid.length : 0;
  const gridCols = puzzle ? (puzzle.grid[0]?.length || 0) : 0;
  const cellPx = Math.max(28, Math.min(38, Math.floor(340 / Math.max(gridCols, 1))));

  return (
    <PageLayout title="Crossword Builder" role={profile?.role}>
      <div style={{ maxWidth: 680, margin: '0 auto' }}>

        {/* Topic input */}
        <div className="card p-5 space-y-3" style={{ marginBottom: 16 }}>
          <h2 style={{ fontWeight: 700, fontSize: 16, fontFamily: 'Syne' }}>Generate a Crossword</h2>
          <p style={{ fontSize: 13, color: 'var(--muted)' }}>Enter any topic — AI will create clues and build the grid automatically.</p>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              className="input"
              style={{ flex: 1 }}
              value={topic}
              onChange={e => setTopic(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !loading && generate()}
              placeholder="e.g. Solar System, Photosynthesis, Python..."
            />
            <button onClick={generate} disabled={loading || !topic.trim()} className="btn-primary" style={{ padding: '10px 20px' }}>
              {loading ? <Spinner size={16} color="white" /> : '✨ Generate'}
            </button>
          </div>
          <p style={{ fontSize: 11, color: 'var(--muted)' }}>💡 Tip: Make sure your Groq/Gemini API key is set in Profile before generating.</p>
        </div>

        {loading && (
          <div className="card" style={{ padding: 48, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <Spinner size={32} />
            <p style={{ color: 'var(--muted)', fontSize: 14 }}>Generating clues and building grid...</p>
          </div>
        )}

        {puzzle && !loading && (
          <>
            {/* Status bar */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span style={{ fontSize: 12, color: 'var(--muted)', background: 'var(--surface)', padding: '4px 10px', borderRadius: 8 }}>
                  Direction: <strong style={{ color: 'var(--primary)' }}>{direction === 'across' ? '→ Across' : '↓ Down'}</strong> (Tab to switch)
                </span>
                {isComplete() && <span style={{ color: '#22c55e', fontWeight: 700, fontSize: 13 }}>🎉 Complete!</span>}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => { setCells({}); setRevealed(false); setSelected(null); }} className="btn-ghost" style={{ fontSize: 12, padding: '6px 14px' }}>Reset</button>
                <button onClick={revealAll} className="btn-secondary" style={{ fontSize: 12, padding: '6px 14px' }}>Reveal All</button>
              </div>
            </div>

            {/* Grid */}
            <div className="card" style={{ padding: 16, overflowX: 'auto', marginBottom: 16 }}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: `repeat(${gridCols}, ${cellPx}px)`,
                gap: 2,
                margin: '0 auto',
                width: 'fit-content',
              }}>
                {Array.from({ length: gridRows }, (_, row) =>
                  Array.from({ length: gridCols }, (_, col) => {
                    const letter = getLetter(row, col);
                    const key = `${row}-${col}`;
                    const num = getWordNum(row, col);
                    const isSel = selected?.row === row && selected?.col === col;
                    const isHi = highlighted.has(key);
                    const typed = cells[key] || '';
                    const correct = letter && typed === letter;
                    const wrong = letter && typed && typed !== letter;

                    if (letter === null) {
                      return <div key={key} style={{ width: cellPx, height: cellPx, background: '#1e1e2e', borderRadius: 2 }} />;
                    }

                    let bg = 'var(--card)';
                    let border = '1.5px solid var(--border)';
                    let color = 'var(--text-primary)';

                    if (isSel)          { bg = '#534AB7'; border = '2px solid #534AB7'; color = 'white'; }
                    else if (isHi)      { bg = 'rgba(83,74,183,0.15)'; border = '1.5px solid #534AB7'; }
                    else if (revealed)  { bg = '#fef9c3'; border = '1.5px solid #eab308'; color = '#92400e'; }
                    else if (correct)   { bg = '#dcfce7'; border = '1.5px solid #22c55e'; color = '#166534'; }
                    else if (wrong)     { bg = '#fee2e2'; border = '1.5px solid #ef4444'; color = '#991b1b'; }

                    return (
                      <div key={key} style={{ position: 'relative', width: cellPx, height: cellPx }}>
                        {num && (
                          <span style={{
                            position: 'absolute', top: 1, left: 2,
                            fontSize: 7, fontWeight: 800, lineHeight: 1, zIndex: 2,
                            color: isSel ? 'rgba(255,255,255,0.8)' : 'var(--muted)',
                            pointerEvents: 'none',
                          }}>{num}</span>
                        )}
                        <input
                          ref={el => { inputRefs.current[key] = el; }}
                          maxLength={2}
                          value={typed}
                          onChange={e => handleChange(e, row, col)}
                          onKeyDown={e => handleKeyDown(e, row, col)}
                          onClick={() => handleCellClick(row, col)}
                          style={{
                            width: '100%', height: '100%',
                            textAlign: 'center', textTransform: 'uppercase',
                            fontSize: cellPx * 0.42, fontWeight: 800,
                            fontFamily: 'Syne, sans-serif',
                            background: bg, color, border, borderRadius: 3,
                            outline: 'none', cursor: 'pointer',
                            paddingTop: num ? Math.floor(cellPx * 0.18) : 0,
                            transition: 'background 0.1s, border 0.1s',
                            caretColor: 'transparent',
                          }}
                        />
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Clues */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
              <div className="card" style={{ padding: 16 }}>
                <h3 style={{ fontWeight: 700, fontSize: 13, color: 'var(--primary)', marginBottom: 10 }}>→ ACROSS</h3>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {puzzle.clues.across.map(c => (
                    <li key={c.number} style={{ fontSize: 12, lineHeight: 1.4, color: 'var(--text-secondary)' }}>
                      <strong style={{ color: 'var(--text-primary)' }}>{c.number}.</strong> {c.clue}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="card" style={{ padding: 16 }}>
                <h3 style={{ fontWeight: 700, fontSize: 13, color: 'var(--teal)', marginBottom: 10 }}>↓ DOWN</h3>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {puzzle.clues.down.map(c => (
                    <li key={c.number} style={{ fontSize: 12, lineHeight: 1.4, color: 'var(--text-secondary)' }}>
                      <strong style={{ color: 'var(--text-primary)' }}>{c.number}.</strong> {c.clue}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </>
        )}

        {!puzzle && !loading && (
          <div className="card" style={{ padding: 48, textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🧩</div>
            <p style={{ fontWeight: 700, fontSize: 16 }}>No puzzle yet</p>
            <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>Enter a topic above and click Generate.</p>
          </div>
        )}

        <div style={{ height: 24 }} />
      </div>
    </PageLayout>
  );
}
