import jsPDF from 'jspdf';

// ── Join Code Generator ────────────────────────────────────────────────────
export const generateJoinCode = () =>
  Math.random().toString(36).substring(2, 8).toUpperCase();

// ── Scoring ────────────────────────────────────────────────────────────────
export function scoreQuestion(question, studentAnswer) {
  if (!studentAnswer && studentAnswer !== 0) return 0;
  
  switch (question.type) {
    case 'mcq': {
      const correct = studentAnswer === question.answer;
      return correct ? question.points : 0; // negative marking handled in total
    }
    case 'fill': {
      const ans = String(studentAnswer).trim().toLowerCase();
      const correct = String(question.answer).trim().toLowerCase();
      return ans === correct ? question.points : 0;
    }
    case 'puzzle': {
      const studentItems = Array.isArray(studentAnswer) ? studentAnswer : studentAnswer.split(',');
      const correctItems = question.answer.split(',').map(s => s.trim());
      const matches = studentItems.filter((item, i) => item.trim() === (correctItems[i] || '').trim()).length;
      return Math.round((matches / correctItems.length) * question.points * 10) / 10;
    }
    case 'qna':
    case 'code':
      // Full points for attempting, AI refines
      return studentAnswer.trim().length > 0 ? question.points : 0;
    default:
      return 0;
  }
}

export function calculateScore(questions, answers, negativeEnabled, negativeValue = 0.25) {
  let total = 0;
  const maxPossible = questions.reduce((s, q) => s + q.points, 0);
  
  const details = questions.map(q => {
    const ans = answers[q.id];
    const earned = scoreQuestion(q, ans);
    let actual = earned;
    
    if (q.type === 'mcq' && negativeEnabled && ans && ans !== q.answer) {
      actual = -negativeValue;
    } else {
      actual = earned;
    }
    
    return { questionId: q.id, answer: ans, earned: actual, max: q.points, correct: earned === q.points };
  });
  
  total = Math.max(0, details.reduce((s, d) => s + d.earned, 0));
  const percentage = maxPossible > 0 ? Math.round((total / maxPossible) * 100) : 0;
  
  return { total, maxPossible, percentage, details };
}

export function getGrade(percentage) {
  if (percentage >= 90) return 'A+';
  if (percentage >= 80) return 'A';
  if (percentage >= 70) return 'B';
  if (percentage >= 60) return 'C';
  if (percentage >= 50) return 'D';
  return 'F';
}

export function getGradeColor(percentage) {
  if (percentage >= 70) return '#1D9E75';
  if (percentage >= 50) return '#F97316';
  return '#EF4444';
}

export function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function formatDuration(seconds) {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

// ── PDF Generation ─────────────────────────────────────────────────────────
export function downloadQuizPDF(quiz, includeAnswers = true) {
  const pdf = new jsPDF();
  const margin = 20;
  let y = margin;
  
  const addText = (text, size, bold, color) => {
    pdf.setFontSize(size);
    pdf.setFont('helvetica', bold ? 'bold' : 'normal');
    if (color) pdf.setTextColor(...color);
    else pdf.setTextColor(26, 23, 48);
    const lines = pdf.splitTextToSize(String(text), 170);
    lines.forEach(line => {
      if (y > 270) { pdf.addPage(); y = margin; }
      pdf.text(line, margin, y);
      y += size * 0.45;
    });
    y += 3;
  };
  
  // Header
  pdf.setFillColor(83, 74, 183);
  pdf.rect(0, 0, 210, 30, 'F');
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(18);
  pdf.setFont('helvetica', 'bold');
  pdf.text(quiz.title, margin, 18);
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  pdf.text(`${quiz.subject} · ${quiz.subjectCode || ''} · Difficulty: ${quiz.difficulty || 'medium'}`, margin, 25);
  
  y = 45;
  if (quiz.description) {
    addText(quiz.description, 11, false, [100, 100, 120]);
    y += 5;
  }
  
  quiz.questions?.forEach((q, i) => {
    addText(`Q${i + 1}. [${q.type.toUpperCase()}] (${q.points} pts)`, 12, true, [83, 74, 183]);
    addText(q.question, 11);
    
    if (q.options?.length) {
      q.options.forEach((opt, oi) => {
        addText(`  ${String.fromCharCode(65 + oi)}. ${opt}`, 10);
      });
    }
    
    if (includeAnswers && q.answer) {
      addText(`Answer: ${q.answer}`, 10, true, [29, 158, 117]);
    }
    if (includeAnswers && q.explanation) {
      addText(`Explanation: ${q.explanation}`, 10, false, [100, 100, 120]);
    }
    y += 4;
  });
  
  pdf.save(`${quiz.title.replace(/[^a-z0-9]/gi, '_')}.pdf`);
}

export function downloadResultPDF(quiz, attempt, profile) {
  const pdf = new jsPDF();
  const margin = 20;
  let y = margin;
  
  const write = (text, size, bold, rgb) => {
    pdf.setFontSize(size);
    pdf.setFont('helvetica', bold ? 'bold' : 'normal');
    pdf.setTextColor(...(rgb || [26, 23, 48]));
    const lines = pdf.splitTextToSize(String(text), 170);
    lines.forEach(line => {
      if (y > 270) { pdf.addPage(); y = margin; }
      pdf.text(line, margin, y);
      y += size * 0.45;
    });
    y += 2;
  };
  
  // Header
  pdf.setFillColor(83, 74, 183);
  pdf.rect(0, 0, 210, 35, 'F');
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(20);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Quiz Result Report', margin, 16);
  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'normal');
  pdf.text(`${profile?.name || 'Student'} · ${quiz.title}`, margin, 25);
  pdf.text(new Date().toLocaleDateString(), margin, 31);
  
  y = 50;
  
  // Score summary
  const pct = attempt.percentage || 0;
  const grade = getGrade(pct);
  write(`Score: ${attempt.score} / ${attempt.maxScore} (${pct}%) — Grade: ${grade}`, 14, true, [83, 74, 183]);
  if (attempt.timeTaken) write(`Time taken: ${formatDuration(attempt.timeTaken)}`, 11);
  y += 5;
  
  // Questions
  quiz.questions?.forEach((q, i) => {
    const detail = attempt.details?.find(d => d.questionId === q.id);
    const studentAns = detail?.answer;
    const isCorrect = detail?.correct;
    
    write(`Q${i + 1}. ${q.question}`, 11, true);
    
    if (studentAns !== undefined && studentAns !== null) {
      const ansText = Array.isArray(studentAns) ? studentAns.join(', ') : String(studentAns);
      write(`Your answer: ${ansText}`, 10, false, isCorrect ? [29, 158, 117] : [239, 68, 68]);
    } else {
      write('Your answer: (not answered)', 10, false, [150, 150, 150]);
    }
    
    if (!isCorrect && q.answer) {
      write(`Correct answer: ${q.answer}`, 10, false, [29, 158, 117]);
    }
    
    if (attempt.aiFeedback?.[q.id]) {
      write(`AI Feedback: ${attempt.aiFeedback[q.id].feedback}`, 10, false, [100, 100, 150]);
    }
    y += 3;
  });
  
  pdf.save(`result_${quiz.title.replace(/[^a-z0-9]/gi, '_')}.pdf`);
}

// ── Crossword Algorithm ────────────────────────────────────────────────────
export function buildCrossword(clues) {
  const GRID_SIZE = 21;
  const grid = Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(null));
  const placed = [];

  const inBounds = (r, c) => r >= 0 && r < GRID_SIZE && c >= 0 && c < GRID_SIZE;

  const canPlace = (word, row, col, horiz) => {
    // Check before and after word
    const beforeR = horiz ? row : row - 1;
    const beforeC = horiz ? col - 1 : col;
    const afterR = horiz ? row : row + word.length;
    const afterC = horiz ? col + word.length : col;
    if (inBounds(beforeR, beforeC) && grid[beforeR][beforeC] !== null) return false;
    if (inBounds(afterR, afterC) && grid[afterR][afterC] !== null) return false;

    let hasIntersection = placed.length === 0;

    for (let i = 0; i < word.length; i++) {
      const r = horiz ? row : row + i;
      const c = horiz ? col + i : col;
      if (!inBounds(r, c)) return false;
      const existing = grid[r][c];

      if (existing !== null) {
        if (existing !== word[i]) return false;
        hasIntersection = true;
      } else {
        // Check perpendicular neighbors
        const adjR1 = horiz ? r - 1 : r;
        const adjC1 = horiz ? c : c - 1;
        const adjR2 = horiz ? r + 1 : r;
        const adjC2 = horiz ? c : c + 1;
        if (inBounds(adjR1, adjC1) && grid[adjR1][adjC1] !== null) return false;
        if (inBounds(adjR2, adjC2) && grid[adjR2][adjC2] !== null) return false;
      }
    }
    return hasIntersection;
  };

  const placeWord = (word, row, col, horiz) => {
    for (let i = 0; i < word.length; i++) {
      const r = horiz ? row : row + i;
      const c = horiz ? col + i : col;
      grid[r][c] = word[i];
    }
  };

  // Sort clues longest first for better placement
  const sorted = [...clues].sort((a, b) => b.answer.length - a.answer.length);

  // Place first word horizontally in center
  const first = sorted[0];
  const centerRow = Math.floor(GRID_SIZE / 2);
  const centerCol = Math.floor((GRID_SIZE - first.answer.length) / 2);
  placeWord(first.answer, centerRow, centerCol, true);
  placed.push({ ...first, row: centerRow, col: centerCol, horizontal: true, number: 1 });

  let number = 2;
  for (let ci = 1; ci < sorted.length && placed.length < 12; ci++) {
    const word = sorted[ci].answer;
    let best = null;

    for (const p of placed) {
      const pWord = p.answer;
      const horiz = !p.horizontal;

      for (let pi = 0; pi < pWord.length; pi++) {
        for (let wi = 0; wi < word.length; wi++) {
          if (pWord[pi] !== word[wi]) continue;

          let row, col;
          if (horiz) {
            row = p.horizontal ? p.row : p.row + pi;
            col = p.horizontal ? p.col + pi - wi : p.col - wi;
          } else {
            row = p.horizontal ? p.row - wi : p.row + pi - wi;
            col = p.horizontal ? p.col + pi : p.col;
          }

          if (canPlace(word, row, col, horiz)) {
            best = { row, col, horizontal: horiz };
            break;
          }
        }
        if (best) break;
      }
      if (best) break;
    }

    if (best) {
      placeWord(word, best.row, best.col, best.horizontal);
      placed.push({ ...sorted[ci], ...best, number: number++ });
    }
  }

  if (placed.length === 0) return { grid: [], words: [], cells: [] };

  // Trim to used area
  const usedRows = placed.flatMap(p =>
    Array.from({ length: p.answer.length }, (_, i) => p.horizontal ? p.row : p.row + i)
  );
  const usedCols = placed.flatMap(p =>
    Array.from({ length: p.answer.length }, (_, i) => p.horizontal ? p.col + i : p.col)
  );

  const minRow = Math.min(...usedRows);
  const minCol = Math.min(...usedCols);
  const maxRow = Math.max(...usedRows);
  const maxCol = Math.max(...usedCols);

  const trimmedGrid = grid
    .slice(minRow, maxRow + 1)
    .map(row => row.slice(minCol, maxCol + 1));

  const normalizedWords = placed.map(p => ({
    ...p,
    row: p.row - minRow,
    col: p.col - minCol,
  }));

  // Build flat cells array for compatibility
  const cells = [];
  trimmedGrid.forEach((row, ri) => {
    row.forEach((letter, ci) => {
      if (letter !== null) cells.push({ row: ri, col: ci, letter });
    });
  });

  return { grid: trimmedGrid, words: normalizedWords, cells };
}
