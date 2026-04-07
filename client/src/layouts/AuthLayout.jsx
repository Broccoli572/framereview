import { Outlet } from 'react-router-dom';
import { Film } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useThemeStore } from '../stores/themeStore';
import { Moon, Sun } from 'lucide-react';

export default function AuthLayout() {
  const { darkMode, toggleTheme } = useThemeStore();

  return (
    <div className="flex min-h-screen flex-col bg-surface-50 dark:bg-surface-950">
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-4">
        <Link to="/" className="flex items-center gap-2 text-surface-900 dark:text-surface-100">
          <Film size={24} className="text-brand-600 dark:text-brand-400" />
          <span className="text-lg font-bold">FrameReview</span>
        </Link>
        <button
          onClick={toggleTheme}
          className="rounded-lg p-2 text-surface-500 hover:bg-surface-100 dark:hover:bg-surface-800"
        >
          {darkMode ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      </div>

      {/* Auth form area */}
      <div className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-md animate-slide-up">
          <Outlet />
        </div>
      </div>

      {/* Footer */}
      <div className="px-6 py-4 text-center text-xs text-surface-400">
        © {new Date().getFullYear()} FrameReview. 视频审阅协作平台
      </div>
    </div>
  );
}
