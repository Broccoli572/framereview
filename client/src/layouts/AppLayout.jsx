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
          'studio-nav-link group',
          isActive && 'studio-nav-link-active'
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
    <div className="studio-shell flex min-h-screen overflow-x-hidden">
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
          'fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r px-4 py-4 backdrop-blur lg:static lg:translate-x-0',
          'studio-sidebar lg:w-[204px] lg:px-2.5 lg:py-2.5',
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="studio-control flex items-center justify-between rounded-xl px-2.5 py-2">
          <Link to="/" className="flex min-w-0 items-center gap-3">
            <div className="studio-brand-mark flex h-8 w-8 items-center justify-center rounded-lg text-white">
              <Film size={18} />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold tracking-tight">粿条</p>
              <p className="studio-muted truncate text-[10px]">FrameReview</p>
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

        <div className="mt-4 space-y-5 overflow-y-auto pb-4">
          <section className="space-y-2">
            <p className="studio-label px-2">工作区</p>
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
                <p className="studio-label">当前工作流</p>
              </div>
              <div className="space-y-1">
                {workflowNav.map((item) => (
                  <AppNavLink key={item.to} to={item.to} icon={item.icon} label={item.label} />
                ))}
              </div>
            </section>
          ) : null}

          {normalizedAsset ? (
            <section className="studio-panel-soft rounded-xl p-3">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="studio-label">当前素材</p>
                  <p className="studio-title mt-1 line-clamp-2 text-xs font-semibold">{normalizedAsset.name}</p>
                </div>
                <Badge variant={normalizedAsset.statusVariant}>{normalizedAsset.statusLabel}</Badge>
              </div>
            </section>
          ) : null}
        </div>
      </aside>

      <div className="flex min-h-screen min-w-0 flex-1 flex-col overflow-x-hidden">
        <header className="studio-topbar sticky top-0 z-30 border-b">
          <div className="flex h-full min-w-0 items-center gap-2 px-3 sm:gap-3 sm:px-4">
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
              <div className="mt-0.5 flex items-center gap-3">
                <h1 className="studio-title truncate text-sm font-bold tracking-tight">{pageContext.title || 'FrameReview'}</h1>
                {loadingContext ? <Spinner size="sm" /> : null}
              </div>
              {pageContext.subtitle ? (
                <p className="studio-muted mt-0.5 hidden text-xs md:block">
                  {pageContext.subtitle}
                </p>
              ) : null}
            </div>

            <div className="hidden w-full max-w-[min(22rem,28vw)] lg:block">
              <SearchInput
                placeholder="搜索"
                onFocus={() => navigate('/search')}
                onChange={() => {}}
              />
            </div>

            {pageContext.primaryAction && pageContext.primaryAction.href !== location.pathname ? (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => navigate(pageContext.primaryAction.href)}
                className="hidden h-8 md:inline-flex"
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
              aria-label={darkMode ? '当前深色模式，点击切换到浅色模式' : '当前浅色模式，点击切换到深色模式'}
            >
              {darkMode ? <Moon size={18} /> : <Sun size={18} />}
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
                <div className="studio-control flex cursor-pointer items-center gap-2 rounded-xl px-2 py-1.5">
                  <Avatar src={user?.avatar} name={user?.name} size="sm" />
                  <div className="hidden min-w-0 text-left md:block">
                    <p className="studio-title truncate text-xs font-semibold">{user?.name || '当前用户'}</p>
                    <p className="studio-muted truncate text-[10px]">{user?.email || '已登录'}</p>
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

        <main className="min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto px-3 py-3 sm:px-4 sm:py-4">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
