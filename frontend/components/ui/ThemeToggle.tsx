'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '@/lib/stores/theme.store';

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <button
      role="switch"
      aria-checked={theme === 'dark'}
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      className="relative flex h-8 w-14 items-center rounded-full bg-[var(--surface-elevated)] border border-[var(--border)] p-1 transition-colors hover:border-[var(--border-glow)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
      title="Toggle Theme"
    >
      <motion.div
        className="absolute h-6 w-6 rounded-full bg-[var(--accent)] flex items-center justify-center shadow-md"
        initial={false}
        animate={{
          left: theme === 'dark' ? 'calc(100% - 1.5rem - 4px)' : '4px',
        }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      >
        <AnimatePresence mode="wait" initial={false}>
          {theme === 'dark' ? (
            <motion.svg
              key="moon"
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 20, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="h-3.5 w-3.5 text-[var(--background)]"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
            </motion.svg>
          ) : (
            <motion.svg
              key="sun"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -20, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="h-4 w-4 text-[var(--accent-fg)]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
              />
            </motion.svg>
          )}
        </AnimatePresence>
      </motion.div>
    </button>
  );
}
