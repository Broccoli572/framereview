import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { Eye, EyeOff, Loader2 } from 'lucide-react';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, error, isLoading, token, user } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState('');

  React.useEffect(() => {
    if (token && user) {
      navigate('/', { replace: true });
    }
  }, [token, user]);

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError('');

    if (!email.trim()) { setFormError('请输入邮箱地址'); return; }
    if (!password) { setFormError('请输入密码'); return; }

    const result = await login({ email: email.trim(), password });
    if (result.success) {
      navigate('/', { replace: true });
    } else {
      setFormError(result.error);
    }
  }

  return (
    <div>
      <h2 className="mb-1 text-xl font-semibold text-surface-900 dark:text-white">登录</h2>
      <p className="mb-6 text-sm text-surface-500 dark:text-surface-400">
        登录您的 FrameReview 账户
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Email */}
        <div>
          <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-surface-700 dark:text-surface-300">
            邮箱地址
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="input"
            autoComplete="email"
          />
        </div>

        {/* Password */}
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <label htmlFor="password" className="text-sm font-medium text-surface-700 dark:text-surface-300">
              密码
            </label>
            <Link to="/forgot-password" className="text-xs text-brand-600 hover:text-brand-700 dark:text-brand-400">
              忘记密码？
            </Link>
          </div>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="input pr-10"
              autoComplete="current-password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 hover:text-surface-600 dark:hover:text-surface-300"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Error */}
        {(formError || error) && (
          <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
            {formError || error}
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={isLoading}
          className="btn-primary w-full"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              登录中…
            </>
          ) : (
            '登录'
          )}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-surface-500 dark:text-surface-400">
        还没有账户？{' '}
        <Link to="/register" className="font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400">
          注册
        </Link>
      </p>
    </div>
  );
}
