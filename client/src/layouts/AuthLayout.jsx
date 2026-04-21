import { Link, Outlet } from 'react-router-dom';
import { Film, Moon, Sun } from 'lucide-react';
import { useThemeStore } from '../stores/themeStore';

export default function AuthLayout() {
  const { darkMode, toggleTheme } = useThemeStore();

  return (
    <div className="min-h-screen bg-surface-50 dark:bg-surface-950">
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col px-4 py-4 lg:px-6">
        <div className="flex items-center justify-between py-2">
          <Link to="/" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-surface-900 text-white dark:bg-surface-100 dark:text-surface-900">
              <Film size={18} />
            </div>
            <div>
              <p className="text-base font-semibold">FrameReview</p>
              <p className="text-xs text-surface-500 dark:text-surface-400">视频协作与审阅平台</p>
            </div>
          </Link>

          <button
            type="button"
            className="rounded-xl border border-surface-200 p-2 text-surface-500 transition-colors hover:bg-surface-100 hover:text-surface-900 dark:border-surface-800 dark:hover:bg-surface-800 dark:hover:text-surface-100"
            onClick={toggleTheme}
            aria-label={darkMode ? '切换到浅色模式' : '切换到深色模式'}
          >
            {darkMode ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>

        <div className="flex flex-1 items-center py-8">
          <div className="grid w-full gap-6 lg:grid-cols-[1.1fr_520px]">
            <section className="hidden rounded-[32px] bg-surface-900 p-10 text-white lg:flex lg:flex-col lg:justify-between">
              <div>
                <p className="text-sm font-medium text-surface-300">登录前导</p>
                <h1 className="mt-4 max-w-xl text-4xl font-semibold tracking-tight">
                  让项目、素材上传和审阅线程保持在同一条清晰的制作链路里。
                </h1>
                <p className="mt-4 max-w-lg text-sm leading-6 text-surface-300">
                  登录后，你会从工作台进入工作区，再进入项目，最后串联上传、处理和审阅操作，不再在多个孤岛页面间来回跳转。
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-2xl bg-white/8 p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-surface-400">工作区</p>
                  <p className="mt-2 text-sm text-surface-200">按团队或业务线组织协作。</p>
                </div>
                <div className="rounded-2xl bg-white/8 p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-surface-400">项目</p>
                  <p className="mt-2 text-sm text-surface-200">在同一上下文管理素材和状态。</p>
                </div>
                <div className="rounded-2xl bg-white/8 p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-surface-400">审阅</p>
                  <p className="mt-2 text-sm text-surface-200">围绕时间点沉淀批注线程。</p>
                </div>
              </div>
            </section>

            <section className="rounded-[32px] border border-surface-200 bg-white p-6 shadow-sm dark:border-surface-800 dark:bg-surface-900 md:p-8">
              <Outlet />
            </section>
          </div>
        </div>

        <p className="py-3 text-center text-xs text-surface-400">
          © {new Date().getFullYear()} FrameReview · 视频审阅协作平台
        </p>
      </div>
    </div>
  );
}
