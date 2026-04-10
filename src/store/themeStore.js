import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useThemeStore = create(
  persist(
    (set, get) => ({
      theme: 'dark',
      fontSize: 'medium',
      animationsEnabled: true,
      sidebarCollapsed: false,

      toggleTheme: () => {
        const next = get().theme === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', next);
        set({ theme: next });
      },

      setTheme: (theme) => {
        document.documentElement.setAttribute('data-theme', theme);
        set({ theme });
      },

      setFontSize: (fontSize) => set({ fontSize }),

      toggleAnimations: () => set((s) => ({ animationsEnabled: !s.animationsEnabled })),

      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
    }),
    {
      name: 'proctorai-theme',
      onRehydrate: (state) => {
        if (state?.theme) {
          document.documentElement.setAttribute('data-theme', state.theme);
        }
      },
    }
  )
);

export default useThemeStore;
