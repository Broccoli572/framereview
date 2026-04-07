import React from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, Home, ArrowLeft } from 'lucide-react';

export default function NotFoundPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-50 px-4 dark:bg-surface-950">
      <div className="text-center">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-surface-100 dark:bg-surface-800">
          <AlertTriangle className="h-10 w-10 text-surface-400 dark:text-surface-500" />
        </div>
        <h1 className="mb-2 text-6xl font-bold text-surface-900 dark:text-white">404</h1>
        <p className="mb-6 text-lg text-surface-500 dark:text-surface-400">
          页面不存在或已被移动
        </p>
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => window.history.back()}
            className="btn-secondary"
          >
            <ArrowLeft className="h-4 w-4" />
            返回上页
          </button>
          <Link to="/" className="btn-primary">
            <Home className="h-4 w-4" />
            回到首页
          </Link>
        </div>
      </div>
    </div>
  );
}
