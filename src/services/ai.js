// AI Service — API keys hardcoded, uses Groq by default
// To change provider or key, edit ACTIVE_PROVIDER and the keys below

// ── Hardcoded API Keys ─────────────────────────────────────────────────────
// Add your key here — only one provider needs a key to work
const HARDCODED_KEYS = {
  groq:   import.meta.env.VITE_GROQ_API_KEY   || '',
  gemini: import.meta.env.VITE_GEMINI_API_KEY  || '',
  openai: import.meta.env.VITE_OPENAI_API_KEY  || '',
};

const ACTIVE_PROVIDER = import.meta.env.VITE_AI_PROVIDER || 'groq';

// ── Provider configs ───────────────────────────────────────────────────────
const PROVIDERS = {
  groq: {
    name: 'Groq',
    url: 'https://api.groq.com/openai/v1/chat/completions',
    model: 'llama-3.3-70b-versatile',
    headers: (key) => ({ 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' }),
    parseResponse: (data) => data.choices[0].message.content,
  },
  gemini: {
    name: 'Gemini',
    url: (key) => `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`,
    model: 'gemini-2.0-flash',
    headers: () => ({ 'Content-Type': 'application/json' }),
    buildBody: (messages) => ({
      contents: [{ parts: [{ text: messages.map(m => m.content).join('\n') }] }]
    }),
    parseResponse: (data) => data.candidates[0].content.parts[0].text,
  },
  openai: {
    name: 'OpenAI',
    url: 'https://api.openai.com/v1/chat/completions',
    model: 'gpt-4o-mini',
    headers: (key) => ({ 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' }),
    parseResponse: (data) => data.choices[0].message.content,
  },
};

function getKey(provider) {
  // Use hardcoded env key
  return HARDCODED_KEYS[provider] || '';
}

export async function callAI(messages, providerOverride) {
  const provider = providerOverride || ACTIVE_PROVIDER;
  const p = PROVIDERS[provider];
  if (!p) throw new Error(`Unknown provider: ${provider}`);

  const key = getKey(provider);
  if (!key) throw new Error(`No API key configured for ${p.name}. Add VITE_${provider.toUpperCase()}_API_KEY to your .env file.`);

  const body = p.buildBody
    ? p.buildBody(messages)
    : { model: p.model, messages, max_tokens: 2000, temperature: 0.7 };

  const url = typeof p.url === 'function' ? p.url(key) : p.url;
  const headers = p.headers(key);

  const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`${p.name} API error ${res.status}: ${err}`);
  }

  const data = await res.json();
  return p.parseResponse(data);
}

// ── Question Generation ────────────────────────────────────────────────────
export async function generateQuestions({ subject, topic, difficulty, types, count }) {
  const typeExamples = types.map(t => {
    switch(t) {
      case 'mcq': return `MCQ: {"id":"q1","type":"mcq","question":"What is...?","options":["A","B","C","D"],"answer":"A","explanation":"Because...","points":1,"bloomsLevel":"remember","poMapping":["PO1"]}`;
      case 'fill': return `Fill: {"id":"q2","type":"fill","question":"The capital of France is ___","options":[],"answer":"paris","explanation":"Paris is the capital","points":1,"bloomsLevel":"remember","poMapping":["PO1"]}`;
      case 'qna': return `Q&A: {"id":"q3","type":"qna","question":"Explain the concept of...","options":[],"answer":"A comprehensive explanation","explanation":"","points":3,"bloomsLevel":"understand","poMapping":["PO1","PO2"]}`;
      case 'code': return `Code: {"id":"q4","type":"code","question":"Write a function that reverses a string","options":[],"answer":"def reverse(s):\\n    return s[::-1]","explanation":"","points":5,"bloomsLevel":"apply","poMapping":["PO3","PO5"]}`;
      case 'puzzle': return `Puzzle: {"id":"q5","type":"puzzle","question":"Arrange these steps in order","options":["Step 3","Step 1","Step 4","Step 2"],"answer":"Step 1,Step 2,Step 3,Step 4","explanation":"Correct order","points":2,"bloomsLevel":"analyze","poMapping":["PO2"]}`;
      default: return '';
    }
  }).join('\n');

  const prompt = `Generate ${count} quiz questions about "${topic}" in ${subject} at ${difficulty} difficulty.
Types to include: ${types.join(', ')}. Distribute evenly.

Return ONLY a valid JSON array, no markdown, no code blocks.
Follow these formats:
${typeExamples}

Rules:
- MCQ must have exactly 4 options
- Fill answer must be lowercase
- Puzzle options = shuffled order, answer = correct comma-separated order
- Code answer uses \\n for newlines
- bloomsLevel: one of remember/understand/apply/analyze/evaluate/create
- poMapping: array of relevant POs from PO1-PO11
- All fields required`;

  const response = await callAI([{ role: 'user', content: prompt }]);
  const clean = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  const parsed = JSON.parse(clean);

  return parsed.map((q, i) => ({
    ...q,
    id: `gen_${Date.now()}_${i}`,
    points: q.points || 1,
    options: q.options || [],
    bloomsLevel: q.bloomsLevel || 'understand',
    poMapping: Array.isArray(q.poMapping) ? q.poMapping : [],
  }));
}

// ── AI Grading ─────────────────────────────────────────────────────────────
export async function gradeAnswer({ question, studentAnswer, correctAnswer, type }) {
  const prompt = `Grade this ${type} response fairly.

Question: ${question}
${type === 'code' ? `Expected approach: ${correctAnswer}` : `Model answer: ${correctAnswer}`}
Student response: ${studentAnswer}

Return ONLY valid JSON:
{"score": 8, "feedback": "Good answer but missing X", "strengths": "Clear explanation", "improvements": "Add more detail about Y"}`;

  const response = await callAI([{ role: 'user', content: prompt }]);
  const clean = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  return JSON.parse(clean);
}

// ── Crossword Clues ────────────────────────────────────────────────────────
export async function generateCrosswordClues(topic) {
  const prompt = `Generate exactly 10 crossword puzzle clue/answer pairs for the topic: "${topic}".

Rules:
- Answers must be single words, 3-12 letters, UPPERCASE
- No spaces or hyphens in answers
- Clues should be clear but not trivially obvious
- Vary word lengths (mix short 3-5 and longer 6-10 letter words)

Return ONLY valid JSON array, no markdown:
[{"clue": "The powerhouse of the cell", "answer": "MITOCHONDRIA"}, ...]`;

  const response = await callAI([{ role: 'user', content: prompt }]);
  const clean = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  return JSON.parse(clean);
}

export { PROVIDERS, ACTIVE_PROVIDER };
