import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { register } from '../api/auth';
import { Eye, EyeOff, Loader2 } from 'lucide-react';

export default function RegisterPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', password_confirmation: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  function updateField(field) {
    return (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!form.name.trim()) { setError('请输入姓名'); return; }
    if (!form.email.trim()) { setError('请输入邮箱地址'); return; }
    if (form.password.length < 8) { setError('密码至少需要 8 个字符'); return; }
    if (form.password !== form.password_confirmation) { setError('两次密码输入不一致'); return; }

    setIsLoading(true);
    try {
      await register({
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        password_confirmation: form.password_confirmation,
      });
      navigate('/login', { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || '注册失败，请稍后重试');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div>
      <h2 className="mb-1 text-xl font-semibold text-surface-900 dark:text-white">注册</h2>
      <p className="mb-6 text-sm text-surface-500 dark:text-surface-400">
        创建您的 FrameReview 账户
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="name" className="mb-1.5 block text-sm font-medium text-surface-700 dark:text-surface-300">姓名</label>
          <input id="name" type="text" value={form.name} onChange={updateField('name')} placeholder="您的姓名" className="input" autoComplete="name" />
        </div>

        <div>
          <label htmlFor="reg-email" className="mb-1.5 block text-sm font-medium text-surface-700 dark:text-surface-300">邮箱地址</label>
          <input id="reg-email" type="email" value={form.email} onChange={updateField('email')} placeholder="you@example.com" className="input" autoComplete="email" />
        </div>

        <div>
          <label htmlFor="reg-password" className="mb-1.5 block text-sm font-medium text-surface-700 dark:text-surface-300">密码</label>
          <div className="relative">
            <input
              id="reg-password"
              type={showPassword ? 'text' : 'password'}
              value={form.password}
              onChange={updateField('password')}
              placeholder="至少 8 个字符"
              className="input pr-10"
              autoComplete="new-password"
            />
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 hover:text-surface-600 dark:hover:text-surface-300">
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <div>
          <label htmlFor="reg-password-confirm" className="mb-1.5 block text-sm font-medium text-surface-700 dark:text-surface-300">确认密码</label>
          <input
            id="reg-password-confirm"
            type="password"
            value={form.password_confirmation}
            onChange={updateField('password_confirmation')}
            placeholder="再次输入密码"
            className="input"
            autoComplete="new-password"
          />
        </div>

        {error && (
          <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">{error}</div>
        )}

        <button type="submit" disabled={isLoading} className="btn-primary w-full">
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              注册中…
            </>
          ) : (
            '注册'
          )}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-surface-500 dark:text-surface-400">
        已有账户？{' '}
        <Link to="/login" className="font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400">登录</Link>
      </p>
    </div>
  );
}
