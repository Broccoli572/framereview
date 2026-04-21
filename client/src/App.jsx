import React, { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores/authStore';
import AuthLayout from './layouts/AuthLayout';
import AppLayout from './layouts/AppLayout';
import LoadingSpinner from './components/LoadingSpinner';

// Lazy-loaded pages
const LoginPage = lazy(() => import('./pages/LoginPage'));
const RegisterPage = lazy(() => import('./pages/RegisterPage'));
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const WorkspacePage = lazy(() => import('./pages/WorkspacePage'));
const WorkspaceSettingsPage = lazy(() => import('./pages/WorkspaceSettingsPage'));
const ProjectPage = lazy(() => import('./pages/ProjectPage'));
const UploadPage = lazy(() => import('./pages/UploadPage'));
const ReviewPage = lazy(() => import('./pages/ReviewPage'));
const ShareViewPage = lazy(() => import('./pages/ShareViewPage'));
const SearchPage = lazy(() => import('./pages/SearchPage'));
const AdminPage = lazy(() => import('./pages/AdminPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));

function ProtectedRoute({ children }) {
  const { token, user } = useAuthStore();
  if (!token || !user) return <Navigate to="/login" replace />;
  return children;
}

function GuestRoute({ children }) {
  const { token, user } = useAuthStore();
  if (token && user) return <Navigate to="/" replace />;
  return children;
}

function AdminRoute({ children }) {
  const user = useAuthStore((s) => s.user);
  if (!user) return <Navigate to="/login" replace />;
  const hasAdminRole =
    user.role === 'admin'
    || user.role === 'system_admin'
    || (Array.isArray(user.roles) && user.roles.some((role) => ['admin', 'system_admin'].includes(role?.name || role?.role?.name)));
  if (!hasAdminRole) return <Navigate to="/" replace />;
  return children;
}

function SuspenseWrapper({ children }) {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen w-screen items-center justify-center bg-surface-50 dark:bg-surface-950">
          <LoadingSpinner size="lg" />
        </div>
      }
    >
      {children}
    </Suspense>
  );
}

export default function App() {
  return (
    <SuspenseWrapper>
      <Routes>
        {/* Guest / Auth routes */}
        <Route
          element={
            <GuestRoute>
              <AuthLayout />
            </GuestRoute>
          }
        >
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        </Route>

        {/* Public share view – no auth required */}
        <Route path="/share/:token" element={<ShareViewPage />} />

        {/* Protected app routes */}
        <Route
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/" element={<DashboardPage />} />
          <Route path="/w/:workspaceId/settings" element={<WorkspaceSettingsPage />} />
          <Route path="/w/:workspaceId" element={<WorkspacePage />} />
          <Route path="/project/:projectId" element={<ProjectPage />} />
          <Route path="/project/:projectId/upload" element={<UploadPage />} />
          <Route path="/review/:assetId" element={<ReviewPage />} />
          <Route path="/search" element={<SearchPage />} />
        </Route>

        {/* Admin routes */}
        <Route
          element={
            <AdminRoute>
              <AppLayout />
            </AdminRoute>
          }
        >
          <Route path="/admin" element={<AdminPage />} />
        </Route>

        {/* 404 */}
        <Route path="/404" element={<NotFoundPage />} />
        <Route path="*" element={<Navigate to="/404" replace />} />
      </Routes>
    </SuspenseWrapper>
  );
}
