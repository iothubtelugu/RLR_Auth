'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Palette, Check, Sun, Moon, Cpu, Zap, Sparkles } from 'lucide-react';
import { useTheme, THEMES, ThemeId } from '@/lib/theme/ThemeContext';

export const ThemeSelector: React.FC = () => {
  const { theme, setTheme, themesList } = useTheme();
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getThemeIcon = (id: ThemeId) => {
    switch (id) {
      case 'light':
        return <Sun className="w-3.5 h-3.5 text-amber-500" />;
      case 'dark':
        return <Moon className="w-3.5 h-3.5 text-blue-400" />;
      case 'cyberpunk':
        return <Zap className="w-3.5 h-3.5 text-cyan-400" />;
      case 'industrial':
        return <Cpu className="w-3.5 h-3.5 text-amber-500" />;
      case 'space':
        return <Sparkles className="w-3.5 h-3.5 text-purple-400" />;
      default:
        return <Palette className="w-3.5 h-3.5" />;
    }
  };

  const currentThemeConfig = THEMES[theme] || THEMES.light;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[var(--border-color,#E2EAF2)] bg-[var(--bg-card,#FFFFFF)] hover:bg-[var(--bg-hover,#F4FBFF)] text-xs font-semibold transition shadow-subtle text-[var(--text-main,#172B4D)]"
        title="Change application theme"
      >
        {getThemeIcon(theme)}
        <span className="hidden sm:inline">{currentThemeConfig.name.split(' ')[0]}</span>
        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: currentThemeConfig.primaryColor }}></span>
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-72 bg-[var(--bg-card,#FFFFFF)] rounded-2xl shadow-elevated border border-[var(--border-color,#E2EAF2)] p-2 z-50 animate-in fade-in zoom-in-95 duration-150">
          <div className="px-3 py-2 border-b border-[var(--border-color,#E2EAF2)] mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary,#64748B)]">
              Choose Color Theme
            </span>
          </div>

          <div className="space-y-1">
            {themesList.map((t) => {
              const isSelected = theme === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => {
                    setTheme(t.id);
                    setOpen(false);
                  }}
                  className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left transition group ${
                    isSelected
                      ? 'bg-[var(--bg-hover,#EBF3FF)] font-bold text-[var(--primary,#073B8C)]'
                      : 'hover:bg-[var(--bg-hover,#F4FBFF)] text-[var(--text-main,#172B4D)]'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    {/* Visual Color Swatches preview */}
                    <div
                      className="w-5 h-5 rounded-lg flex items-center justify-center border shadow-xs"
                      style={{ backgroundColor: t.bgColor, borderColor: t.cardColor }}
                    >
                      <div
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: t.primaryColor }}
                      ></div>
                    </div>

                    <div>
                      <div className="text-xs font-semibold leading-tight">{t.name}</div>
                      <div className="text-[10px] text-[var(--text-secondary,#64748B)] leading-tight mt-0.5">
                        {t.badgeLabel}
                      </div>
                    </div>
                  </div>

                  {isSelected && <Check className="w-4 h-4 text-[var(--primary,#073B8C)]" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
