import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate, useParams, Outlet } from 'react-router-dom';
import {
  Film, LayoutDashboard, FolderOpen, Upload, Settings,
  PanelLeftClose, PanelLeft, Search, Bell, Moon, Sun, LogOut, User, ChevronDown
} from 'lucide-react';
import clsx from 'clsx';
import { useAuthStore } from '../stores/authStore';
import { useThemeStore } from '../stores/themeStore';
import Avatar from '../components/ui/Avatar';
import Badge from '../components/ui/Badge';
import Dropdown from '../components/ui/Dropdown';
import SearchInput from '../components/ui/SearchInput';
import Spinner from '../components/ui/Spinner';
import Button from '../components/ui/Button';

const navItems = [
  { key: 'dashboard', label: '工作台', icon: LayoutDashboard, path: '/' },
  { key: 'projects', label: '项目', icon: FolderOpen, path: null },
  { key: 'upload', label: '上传', icon: Upload, path: null },
];

export default function AppLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, logout } = useAuthStore();
  const { darkMode, toggleTheme } = useThemeStore();
  const location = useLocation();
  const navigate = useNavigate();
  const { workspaceId } = useParams();

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path) => {
    if (!path) return false;
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-surface-50 dark:bg-surface-950">
      {/* Mobile overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={clsx(
          'fixed inset-y-0 left-0 z-50 flex flex-col bg-white dark:bg-surface-900 border-r border-surface-200 dark:border-surface-800 transition-all duration-300 lg:static lg:z-auto',
          sidebarCollapsed ? 'w-16' : 'w-60',
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        {/* Logo */}
        <div className="flex h-14 items-center gap-2 px-4 border-b border-surface-200 dark:border-surface-800">
          <Film size={22} className="text-brand-600 dark:text-brand-400 flex-shrink-0" />
          {!sidebarCollapsed && (
            <span className="text-base font-bold text-surface-900 dark:text-surface-100 truncate">
              FrameReview
            </span>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 px-3 py-4 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <Link
                key={item.key}
                to={item.path || '/'}
                onClick={() => item.path || setMobileMenuOpen(false)}
                className={clsx(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  active
                    ? 'bg-brand-50 text-brand-700 dark:bg-brand-900/20 dark:text-brand-300'
                    : 'text-surface-600 hover:bg-surface-100 hover:text-surface-900 dark:text-surface-400 dark:hover:bg-surface-800 dark:hover:text-surface-200',
                  sidebarCollapsed && 'justify-center px-2'
                )}
                title={sidebarCollapsed ? item.label : undefined}
              >
                <Icon size={18} className="flex-shrink-0" />
                {!sidebarCollapsed && <span>{item.label}</span>}
              </Link>
            );
          })}

          {workspaceId && (
            <>
              <div className="my-3 border-t border-surface-200 dark:border-surface-800" />
              <Link
                to={`/w/${workspaceId}/settings`}
                className={clsx(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  location.pathname.includes('/settings')
                    ? 'bg-brand-50 text-brand-700 dark:bg-brand-900/20 dark:text-brand-300'
                    : 'text-surface-600 hover:bg-surface-100 hover:text-surface-900 dark:text-surface-400 dark:hover:bg-surface-800 dark:hover:text-surface-200',
                  sidebarCollapsed && 'justify-center px-2'
                )}
                title={sidebarCollapsed ? '工作区设置' : undefined}
              >
                <Settings size={18} className="flex-shrink-0" />
                {!sidebarCollapsed && <span>工作区设置</span>}
              </Link>
            </>
          )}
        </nav>

        {/* Sidebar footer */}
        <div className="border-t border-surface-200 dark:border-surface-800 px-3 py-3 space-y-2">
          {!sidebarCollapsed && (
            <button
              onClick={toggleTheme}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-surface-600 hover:bg-surface-100 dark:text-surface-400 dark:hover:bg-surface-800"
            >
              {darkMode ? <Sun size={18} /> : <Moon size={18} />}
              {darkMode ? '浅色模式' : '深色模式'}
            </button>
          )}
          {sidebarCollapsed && (
            <button
              onClick={toggleTheme}
              className="flex w-full items-center justify-center rounded-lg p-2 text-surface-600 hover:bg-surface-100 dark:text-surface-400 dark:hover:bg-surface-800"
              title={darkMode ? '浅色模式' : '深色模式'}
            >
              {darkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          )}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="hidden lg:flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-surface-600 hover:bg-surface-100 dark:text-surface-400 dark:hover:bg-surface-800"
          >
            {sidebarCollapsed ? <PanelLeft size={18} className="flex-shrink-0" /> : <PanelLeftClose size={18} className="flex-shrink-0" />}
            {!sidebarCollapsed && <span>收起侧栏</span>}
          </button>
        </div>
      </aside>

      {/* Main content area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="flex h-14 items-center gap-4 border-b border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-900 px-4 lg:px-6">
          {/* Mobile menu toggle */}
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="rounded-lg p-2 text-surface-500 hover:bg-surface-100 lg:hidden dark:hover:bg-surface-800"
          >
            <PanelLeft size={18} />
          </button>

          {/* Breadcrumb */}
          <nav className="hidden sm:flex items-center gap-1.5 text-sm text-surface-500 dark:text-surface-400 flex-1 min-w-0">
            <Link to="/" className="hover:text-surface-700 dark:hover:text-surface-200 truncate">
              工作台
            </Link>
            {location.pathname !== '/' && (
              <>
                <span className="text-surface-300 dark:text-surface-600">/</span>
                <span className="text-surface-700 dark:text-surface-200 truncate">
                  {getBreadcrumbLabel(location.pathname)}
                </span>
              </>
            )}
          </nav>

          {/* Mobile breadcrumb */}
          <nav className="sm:hidden text-sm text-surface-500 dark:text-surface-400 truncate">
            {getBreadcrumbLabel(location.pathname)}
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-2">
            {/* Search button - navigates to /search */}
            <button
              onClick={() => navigate('/search')}
              className="rounded-lg p-2 text-surface-500 hover:bg-surface-100 dark:hover:bg-surface-800 lg:hidden"
            >
              <Search size={18} />
            </button>

            {/* Desktop search */}
            <div className="hidden lg:block relative">
              <SearchInput
                placeholder="搜索项目、资源... (⌘K)"
                className="w-64"
                onFocus={() => navigate('/search')}
              />
            </div>

            {/* Notifications */}
            <button className="relative rounded-lg p-2 text-surface-500 hover:bg-surface-100 dark:hover:bg-surface-800">
              <Bell size={18} />
              {/* Unread badge placeholder */}
              <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-red-500" />
            </button>

            {/* User menu */}
            <Dropdown
              trigger={
                <div className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-surface-100 dark:hover:bg-surface-800 cursor-pointer">
                  <Avatar src={user?.avatar} name={user?.name} size="sm" />
                  <span className="hidden md:block text-sm font-medium text-surface-700 dark:text-surface-300 max-w-[120px] truncate">
                    {user?.name || '用户'}
                  </span>
                  <ChevronDown size={14} className="hidden md:block text-surface-400" />
                </div>
              }
              align="right"
              items={[
                { label: '个人资料', icon: User, onClick: () => {} },
                { divider: true },
                { label: '退出登录', icon: LogOut, danger: true, onClick: handleLogout },
              ]}
            />
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function getBreadcrumbLabel(pathname) {
  if (pathname.startsWith('/w/')) {
    if (pathname.includes('/settings')) return '工作区设置';
    return '工作区';
  }
  if (pathname.startsWith('/project/')) return '项目';
  if (pathname.startsWith('/review/')) return '审阅';
  if (pathname.startsWith('/admin')) return '管理后台';
  if (pathname.startsWith('/search')) return '搜索';
  return '工作台';
}
