"use client";

import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';

interface ThemeToggleProps {
  className?: string;
}

export function ThemeToggle({ className = "absolute top-4 right-4" }: ThemeToggleProps) {
  const { theme, setTheme } = useTheme();

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  return (
    <Button
      onClick={toggleTheme}
      variant="ghost"
      size="icon"
      className={`${className} text-2xl hover:scale-110 hover:rotate-12 transition-all duration-200 active:scale-90 z-50`}
    >
      {theme === 'dark' ? '☀️' : '🌙'}
    </Button>
  );
}
