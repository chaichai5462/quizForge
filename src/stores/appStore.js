import { create } from 'zustand';

const useAppStore = create((set, get) => ({
  darkMode: localStorage.getItem('darkMode') === 'true',
  toasts: [],

  toggleDark: () => {
    const next = !get().darkMode;
    localStorage.setItem('darkMode', next);
    document.documentElement.classList.toggle('dark', next);
    set({ darkMode: next });
  },

  initDark: () => {
    const dark = localStorage.getItem('darkMode') === 'true';
    document.documentElement.classList.toggle('dark', dark);
    set({ darkMode: dark });
  },

  toast: (message, type = 'info') => {
    const id = Date.now();
    set(s => ({ toasts: [...s.toasts, { id, message, type }] }));
    setTimeout(() => {
      set(s => ({ toasts: s.toasts.filter(t => t.id !== id) }));
    }, 3000);
  },
}));

export default useAppStore;
export { useAppStore };
