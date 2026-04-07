import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useTheme } from '../hooks/useTheme';
import { getInitials, cn } from '../lib/utils';
import {
  User,
  Settings,
  Shield,
  LogOut,
  Moon,
  Sun,
  Monitor,
  ChevronUp,
} from 'lucide-react';

export default function UserMenu() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const { theme, toggleTheme, isDark } = useTheme();
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    function handleClick(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleLogout = async () => {
    setOpen(false);
    await logout();
    navigate('/login');
  };

  const initials = getInitials(user?.name || user?.email || 'U');

  const themeIcon =
    theme === 'light' ? <Sun className="h-4 w-4" /> :
    theme === 'dark' ? <Moon className="h-4 w-4" /> :
    <Monitor className="h-4 w-4" />;

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-surface-100 dark:hover:bg-surface-800"
      >
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white">
          {initials}
        </div>
        <span className="hidden text-sm font-medium text-surface-700 dark:text-surface-200 md:block">
          {user?.name || '用户'}
        </span>
        <ChevronUp
          className={cn(
            'hidden h-3 w-3 text-surface-400 transition-transform md:block',
            open && 'rotate-180'
          )}
        />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-56 rounded-xl border border-surface-200 bg-white py-1 shadow-xl dark:border-surface-700 dark:bg-surface-900 animate-scale-in">
          {/* User info */}
          <div className="border-b border-surface-200 px-4 py-3 dark:border-surface-700">
            <p className="text-sm font-medium text-surface-900 dark:text-white">
              {user?.name || '用户'}
            </p>
            <p className="text-xs text-surface-500 dark:text-surface-400">{user?.email}</p>
          </div>

          {/* Menu items */}
          <div className="py-1">
            <button
              onClick={() => { setOpen(false); }}
              className="flex w-full items-center gap-3 px-4 py-2 text-sm text-surface-700 hover:bg-surface-50 dark:text-surface-300 dark:hover:bg-surface-800"
            >
              <User className="h-4 w-4" />
              个人资料
            </button>

            <button
              onClick={() => { toggleTheme(); setOpen(false); }}
              className="flex w-full items-center gap-3 px-4 py-2 text-sm text-surface-700 hover:bg-surface-50 dark:text-surface-300 dark:hover:bg-surface-800"
            >
              {themeIcon}
              <span>
                {theme === 'light' ? '浅色模式' : theme === 'dark' ? '深色模式' : '跟随系统'}
              </span>
            </button>

            {user?.role === 'admin' && (
              <button
                onClick={() => { navigate('/admin'); setOpen(false); }}
                className="flex w-full items-center gap-3 px-4 py-2 text-sm text-surface-700 hover:bg-surface-50 dark:text-surface-300 dark:hover:bg-surface-800"
              >
                <Shield className="h-4 w-4" />
                管理后台
              </button>
            )}
          </div>

          <div className="border-t border-surface-200 py-1 dark:border-surface-700">
            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
            >
              <LogOut className="h-4 w-4" />
              退出登录
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
