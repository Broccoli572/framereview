import { useEffect, useMemo, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Bell,
  Film,
  FolderKanban,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  Search,
  Settings,
  Shield,
  Sun,
  Upload,
  User,
  X,
} from 'lucide-react';
import clsx from 'clsx';
import client from '../api/client';
import { getPageContext, normalizeAsset } from '../lib/view-models';
import Avatar from '../components/ui/Avatar';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Dropdown from '../components/ui/Dropdown';
import SearchInput from '../components/ui/SearchInput';
import Spinner from '../components/ui/Spinner';
import { useAuthStore } from '../stores/authStore';
import { useThemeStore } from '../stores/themeStore';

function getIsAdmin(user) {
  if (!user) return false;
  if (user.role === 'admin' || user.role === 'system_admin') return true;
  return Array.isArray(user.roles)
    && user.roles.some((role) => ['admin', 'system_admin'].includes(role?.name || role?.role?.name));
}

function AppNavLink({ to, icon: Icon, label, end = false, badge }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        clsx(
          'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors',
          isActive
            ? 'bg-surface-900 text-white dark:bg-surface-100 dark:text-surface-900'
            : 'text-surface-600 hover:bg-surface-100 hover:text-surface-900 dark:text-surface-400 dark:hover:bg-surface-800 dark:hover:text-surface-100'
        )
      }
    >
      <Icon size={16} className="shrink-0" />
      <span className="truncate">{label}</span>
      {badge ? <span className="ml-auto text-xs opacity-80">{badge}</span> : null}
    </NavLink>
  );
}

export default function AppLayout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, logout } = useAuthStore();
  const { darkMode, toggleTheme } = useThemeStore();
  const location = useLocation();
  const navigate = useNavigate();
  const { workspaceId, projectId, assetId } = useParams();

  const assetQuery = useQuery({
    queryKey: ['layout-asset', assetId],
    queryFn: async () => {
      const response = await client.get(`/assets/${assetId}`);
      return response.data?.data || response.data || null;
    },
    enabled: Boolean(assetId),
  });

  const normalizedAsset = useMemo(
    () => (assetQuery.data ? normalizeAsset(assetQuery.data) : null),
    [assetQuery.data]
  );

  const resolvedProjectId = projectId || normalizedAsset?.projectId || null;
  const projectQuery = useQuery({
    queryKey: ['layout-project', resolvedProjectId],
    queryFn: async () => {
      const response = await client.get(`/projects/${resolvedProjectId}`);
      const project = response.data?.data || response.data || null;
      return project
        ? {
            ...project,
            workspaceId: project.workspaceId || project.workspace?.id || null,
            workspaceName: project.workspace?.name || null,
          }
        : null;
    },
    enabled: Boolean(resolvedProjectId),
  });

  const resolvedWorkspaceId = workspaceId || projectQuery.data?.workspaceId || normalizedAsset?.workspaceId || null;
  const workspaceQuery = useQuery({
    queryKey: ['layout-workspace', resolvedWorkspaceId],
    queryFn: async () => {
      const response = await client.get(`/workspaces/${resolvedWorkspaceId}`);
      return response.data?.data || response.data || null;
    },
    enabled: Boolean(resolvedWorkspaceId),
  });

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const pageContext = getPageContext({
    pathname: location.pathname,
    workspace: workspaceQuery.data,
    project: projectQuery.data,
    asset: normalizedAsset,
  });

  const primaryNav = [
    { to: '/', icon: LayoutDashboard, label: '工作台', end: true },
    { to: '/search', icon: Search, label: '搜索' },
  ];

  const workflowNav = [
    workspaceQuery.data
      ? { to: `/w/${workspaceQuery.data.id}`, icon: FolderKanban, label: workspaceQuery.data.name || '当前工作区' }
      : null,
    projectQuery.data
      ? { to: `/project/${projectQuery.data.id}`, icon: Film, label: projectQuery.data.name || '当前项目' }
      : null,
    projectQuery.data
      ? { to: `/project/${projectQuery.data.id}/upload`, icon: Upload, label: '上传' }
      : null,
    workspaceQuery.data
      ? { to: `/w/${workspaceQuery.data.id}/settings`, icon: Settings, label: '设置' }
      : null,
  ].filter(Boolean);

  const canAccessAdmin = getIsAdmin(user);
  const loadingContext = assetQuery.isLoading || projectQuery.isLoading || workspaceQuery.isLoading;

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="flex min-h-screen bg-surface-50 text-surface-900 dark:bg-surface-950 dark:text-surface-100">
      {mobileMenuOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-surface-950/60 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
          aria-label="关闭导航"
        />
      ) : null}

      <aside
        className={clsx(
          'fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-surface-200 bg-white/95 px-4 py-4 backdrop-blur dark:border-surface-800 dark:bg-surface-950/95 lg:static lg:translate-x-0',
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex items-center justify-between rounded-2xl border border-surface-200 bg-surface-50 px-4 py-3 dark:border-surface-800 dark:bg-surface-900">
          <Link to="/" className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-surface-900 text-white dark:bg-surface-100 dark:text-surface-900">
              <Film size={18} />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">FrameReview</p>
              <p className="truncate text-xs text-surface-500 dark:text-surface-400">协作审阅</p>
            </div>
          </Link>

          <button
            type="button"
            className="rounded-lg p-2 text-surface-500 hover:bg-surface-100 hover:text-surface-900 lg:hidden dark:hover:bg-surface-800 dark:hover:text-surface-100"
            onClick={() => setMobileMenuOpen(false)}
            aria-label="关闭导航"
          >
            <X size={18} />
          </button>
        </div>

        <div className="mt-5 space-y-6 overflow-y-auto pb-4">
          <section className="space-y-2">
            <p className="px-3 text-xs font-semibold uppercase tracking-[0.16em] text-surface-400">全局</p>
            <div className="space-y-1">
              {primaryNav.map((item) => (
                <AppNavLink key={item.to} to={item.to} icon={item.icon} label={item.label} end={item.end} />
              ))}
              {canAccessAdmin ? <AppNavLink to="/admin" icon={Shield} label="后台" /> : null}
            </div>
          </section>

          {workflowNav.length ? (
            <section className="space-y-3">
              <div className="px-3">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-surface-400">当前工作流</p>
              </div>
              <div className="space-y-1">
                {workflowNav.map((item) => (
                  <AppNavLink key={item.to} to={item.to} icon={item.icon} label={item.label} />
                ))}
              </div>
            </section>
          ) : null}

          {normalizedAsset ? (
            <section className="rounded-2xl border border-surface-200 bg-surface-50 p-4 dark:border-surface-800 dark:bg-surface-900">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-surface-400">当前素材</p>
                  <p className="mt-1 line-clamp-2 text-sm font-medium">{normalizedAsset.name}</p>
                </div>
                <Badge variant={normalizedAsset.statusVariant}>{normalizedAsset.statusLabel}</Badge>
              </div>
            </section>
          ) : null}
        </div>
      </aside>

      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 border-b border-surface-200 bg-white/90 backdrop-blur dark:border-surface-800 dark:bg-surface-950/85">
          <div className="flex items-center gap-3 px-4 py-3 lg:px-6">
            <button
              type="button"
              className="rounded-xl border border-surface-200 p-2 text-surface-600 lg:hidden dark:border-surface-800 dark:text-surface-300"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="打开导航"
            >
              <Menu size={18} />
            </button>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2 text-xs text-surface-500 dark:text-surface-400">
                {pageContext.breadcrumb.map((item, index) => (
                  <div key={`${item.href || item.label}-${index}`} className="flex items-center gap-2">
                    {index > 0 ? <span>/</span> : null}
                    {item.href ? (
                      <Link to={item.href} className="transition-colors hover:text-surface-900 dark:hover:text-surface-100">
                        {item.label}
                      </Link>
                    ) : (
                      <span>{item.label}</span>
                    )}
                  </div>
                ))}
              </div>
              <div className="mt-1 flex items-center gap-3">
                <h1 className="truncate text-lg font-semibold">{pageContext.title || 'FrameReview'}</h1>
                {loadingContext ? <Spinner size="sm" /> : null}
              </div>
              {pageContext.subtitle ? (
                <p className="mt-1 hidden text-sm text-surface-500 dark:text-surface-400 md:block">
                  {pageContext.subtitle}
                </p>
              ) : null}
            </div>

            <div className="hidden w-full max-w-sm lg:block">
              <SearchInput
                placeholder="搜索"
                onFocus={() => navigate('/search')}
                onChange={() => {}}
              />
            </div>

            {pageContext.primaryAction ? (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => navigate(pageContext.primaryAction.href)}
                className="hidden md:inline-flex"
              >
                {pageContext.primaryAction.label}
              </Button>
            ) : null}

            <button
              type="button"
              className="rounded-xl p-2 text-surface-500 transition-colors hover:bg-surface-100 hover:text-surface-900 lg:hidden dark:hover:bg-surface-800 dark:hover:text-surface-100"
              onClick={() => navigate('/search')}
              aria-label="打开搜索"
            >
              <Search size={18} />
            </button>

            <button
              type="button"
              className="rounded-xl p-2 text-surface-500 transition-colors hover:bg-surface-100 hover:text-surface-900 dark:hover:bg-surface-800 dark:hover:text-surface-100"
              onClick={toggleTheme}
              aria-label={darkMode ? '切换到浅色模式' : '切换到深色模式'}
            >
              {darkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            <button
              type="button"
              className="relative rounded-xl p-2 text-surface-500 transition-colors hover:bg-surface-100 hover:text-surface-900 dark:hover:bg-surface-800 dark:hover:text-surface-100"
              aria-label="通知"
            >
              <Bell size={18} />
              <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-amber-500" />
            </button>

            <Dropdown
              align="right"
              trigger={(
                <div className="flex cursor-pointer items-center gap-3 rounded-2xl border border-surface-200 bg-white px-2.5 py-1.5 dark:border-surface-800 dark:bg-surface-900">
                  <Avatar src={user?.avatar} name={user?.name} size="sm" />
                  <div className="hidden min-w-0 text-left md:block">
                    <p className="truncate text-sm font-medium">{user?.name || '当前用户'}</p>
                    <p className="truncate text-xs text-surface-500 dark:text-surface-400">{user?.email || '已登录'}</p>
                  </div>
                </div>
              )}
              items={[
                { label: '个人资料', icon: User, onClick: () => {} },
                { divider: true },
                { label: '退出登录', icon: LogOut, danger: true, onClick: handleLogout },
              ]}
            />
          </div>
        </header>

        <main className="min-h-0 flex-1 overflow-y-auto px-4 py-5 lg:px-6 lg:py-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
