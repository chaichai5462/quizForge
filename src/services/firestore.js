import {
  collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc,
  query, where, onSnapshot, serverTimestamp
} from 'firebase/firestore';
import { db } from './firebase';

// ── Users ──────────────────────────────────────────────────────────────────
export const createUserProfile = (uid, data) =>
  setDoc(doc(db, 'users', uid), { ...data, createdAt: serverTimestamp() });

export const getUserProfile = async (uid) => {
  const snap = await getDoc(doc(db, 'users', uid));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
};

export const updateUserProfile = (uid, data) =>
  updateDoc(doc(db, 'users', uid), data);

export const getAllTeachers = async () => {
  const snap = await getDocs(query(collection(db, 'users'), where('role', '==', 'teacher')));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

export const getAllStudents = async () => {
  const snap = await getDocs(query(collection(db, 'users'), where('role', '==', 'student')));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

// ── Quizzes ────────────────────────────────────────────────────────────────
export const createQuiz = async (data) => {
  const ref = doc(collection(db, 'quizzes'));
  await setDoc(ref, { ...data, id: ref.id, createdAt: serverTimestamp() });
  return ref.id;
};

export const updateQuiz = (id, data) => updateDoc(doc(db, 'quizzes', id), data);
export const deleteQuiz = (id) => deleteDoc(doc(db, 'quizzes', id));

export const getQuiz = async (id) => {
  const snap = await getDoc(doc(db, 'quizzes', id));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
};

export const getQuizByJoinCode = async (code) => {
  const snap = await getDocs(query(collection(db, 'quizzes'), where('joinCode', '==', code.toUpperCase())));
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { id: d.id, ...d.data() };
};

export const getTeacherQuizzes = async (teacherId) => {
  const snap = await getDocs(query(collection(db, 'quizzes'), where('creatorId', '==', teacherId)));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

export const getAllPublishedQuizzes = async () => {
  const snap = await getDocs(query(collection(db, 'quizzes'), where('status', '==', 'published')));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

// Get quizzes visible to a student based on:
// 1. Connected to teacher AND 2. Batch/AcademicYear match (if quiz has targets set)
export const getStudentVisibleQuizzes = async (studentId, studentProfile) => {
  // Get accepted teacher connections
  const connSnap = await getDocs(query(
    collection(db, 'connections'),
    where('studentId', '==', studentId),
    where('status', '==', 'accepted')
  ));
  const connectedTeacherIds = connSnap.docs.map(d => d.data().teacherId);
  if (!connectedTeacherIds.length) return [];

  const allQuizzes = await getAllPublishedQuizzes();

  return allQuizzes.filter(q => {
    // Must be from a connected teacher
    if (!connectedTeacherIds.includes(q.creatorId)) return false;
    // If quiz has batch/year targeting, student must match
    if (q.targetBatch && studentProfile?.batch && q.targetBatch !== studentProfile.batch) return false;
    if (q.targetYear && studentProfile?.academicYear && q.targetYear !== studentProfile.academicYear) return false;
    return true;
  });
};

export const getQuizzesByTeacherIds = async (teacherIds) => {
  if (!teacherIds.length) return [];
  const snap = await getDocs(collection(db, 'quizzes'));
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .filter(q => teacherIds.includes(q.creatorId) && q.status === 'published');
};

// ── Attempts ───────────────────────────────────────────────────────────────
export const saveAttempt = async (data) => {
  const ref = doc(collection(db, 'attempts'));
  await setDoc(ref, { ...data, id: ref.id, submittedAt: serverTimestamp() });
  return ref.id;
};

export const getAttemptsByQuiz = async (quizId) => {
  const snap = await getDocs(query(collection(db, 'attempts'), where('quizId', '==', quizId)));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

export const getAttemptsByStudent = async (studentId) => {
  const snap = await getDocs(query(collection(db, 'attempts'), where('userId', '==', studentId)));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

export const getAllAttempts = async () => {
  const snap = await getDocs(collection(db, 'attempts'));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

export const updateAttempt = (id, data) => updateDoc(doc(db, 'attempts', id), data);

// ── Connections ────────────────────────────────────────────────────────────
// Connection doc: { studentId, studentName, studentEmail, studentUSN, studentDept, studentBatch, studentYear,
//                   teacherId, teacherName, teacherDept, teacherCode,
//                   status: pending|accepted|rejected, createdAt, respondedAt }

export const createConnection = async (data) => {
  const ref = doc(collection(db, 'connections'));
  await setDoc(ref, { ...data, id: ref.id, createdAt: serverTimestamp() });
  return ref.id;
};

export const getConnectionsByTeacher = async (teacherId) => {
  const snap = await getDocs(query(collection(db, 'connections'), where('teacherId', '==', teacherId)));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

export const getConnectionsByStudent = async (studentId) => {
  const snap = await getDocs(query(collection(db, 'connections'), where('studentId', '==', studentId)));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

export const updateConnection = (id, data) =>
  updateDoc(doc(db, 'connections', id), { ...data, respondedAt: serverTimestamp() });

export const checkExistingConnection = async (studentId, teacherId) => {
  const snap = await getDocs(query(
    collection(db, 'connections'),
    where('studentId', '==', studentId),
    where('teacherId', '==', teacherId)
  ));
  return snap.empty ? null : { id: snap.docs[0].id, ...snap.docs[0].data() };
};

// ── Announcements ──────────────────────────────────────────────────────────
export const createAnnouncement = async (data) => {
  const ref = doc(collection(db, 'announcements'));
  await setDoc(ref, { ...data, id: ref.id, createdAt: serverTimestamp() });
  return ref.id;
};

export const getAnnouncementsByTeacher = async (teacherId) => {
  const snap = await getDocs(query(collection(db, 'announcements'), where('teacherId', '==', teacherId)));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
};

export const getAnnouncementsForStudent = async (teacherIds) => {
  if (!teacherIds.length) return [];
  const snap = await getDocs(collection(db, 'announcements'));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
    .filter(a => teacherIds.includes(a.teacherId))
    .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
};

// ── Live Sessions ──────────────────────────────────────────────────────────
export const startLiveSession = (quizId, data) =>
  setDoc(doc(db, 'live_sessions', quizId), { ...data, isActive: true });

export const updateLiveSession = (quizId, data) =>
  updateDoc(doc(db, 'live_sessions', quizId), data);

export const subscribeLiveSession = (quizId, callback) =>
  onSnapshot(doc(db, 'live_sessions', quizId), snap => {
    callback(snap.exists() ? { id: snap.id, ...snap.data() } : null);
  });

export const getAttemptById = async (id) => {
  const snap = await getDoc(doc(db, 'attempts', id));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
};
