import { create } from 'zustand';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from 'firebase/auth';
import { auth } from '../services/firebase';
import { createUserProfile, getUserProfile } from '../services/firestore';

const useAuthStore = create((set, get) => ({
  user: null,
  profile: null,
  loading: true,
  error: null,

  init: () => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const profile = await getUserProfile(firebaseUser.uid);
        set({ user: firebaseUser, profile, loading: false });
      } else {
        set({ user: null, profile: null, loading: false });
      }
    });
    return unsub;
  },

  signup: async (email, password, name, role, extra = {}) => {
    set({ error: null });
    const { user } = await createUserWithEmailAndPassword(auth, email, password);
    const teacherCode = role === 'teacher'
      ? 'TC' + Math.random().toString(36).slice(2,8).toUpperCase()
      : null;
    const profileData = { name, email, role, id: user.uid, ...extra };
    if (teacherCode) profileData.teacherCode = teacherCode;
    await createUserProfile(user.uid, profileData);
    set({ user, profile: profileData });
    return profileData;
  },

  login: async (email, password) => {
    set({ error: null });
    const { user } = await signInWithEmailAndPassword(auth, email, password);
    const profile = await getUserProfile(user.uid);
    set({ user, profile });
    return profile;
  },

  logout: async () => {
    await signOut(auth);
    set({ user: null, profile: null });
  },

  updateProfile: (updates) => {
    set(state => ({ profile: { ...state.profile, ...updates } }));
  },

  setError: (error) => set({ error }),
}));

export default useAuthStore;
export { useAuthStore };
