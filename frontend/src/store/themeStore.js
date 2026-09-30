import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const THEME_MODES = {
    SOFT: 'soft',   // Soft Slate / Cool Gray (Reduces glare, eye-comfort)
    PURE: 'pure',   // Crisp Clean White
    DARK: 'dark',   // Classic Navy Dark
};

export const useThemeStore = create(
    persist(
        (set) => ({
            themeMode: THEME_MODES.SOFT, // Default to soft to relieve white intensity
            setThemeMode: (mode) => set({ themeMode: mode }),
        }),
        {
            name: 'glx-theme-storage',
        }
    )
);
