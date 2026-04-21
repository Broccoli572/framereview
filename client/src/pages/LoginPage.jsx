import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, error, isLoading, token, user } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    if (token && user) {
      navigate('/', { replace: true });
    }
  }, [navigate, token, user]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!email.trim()) {
      setFormError('请输入邮箱地址。');
      return;
    }
    if (!password) {
      setFormError('请输入密码。');
      return;
    }

    setFormError('');
    const result = await login({ email: email.trim(), password });
    if (result.success) {
      navigate('/', { replace: true });
    }
  };

  return (
    <div>
      <p className="text-sm font-medium text-surface-500 dark:text-surface-400">欢迎回来</p>
      <h2 className="mt-2 text-3xl font-semibold tracking-tight">登录你的账号</h2>
      <p className="mt-2 text-sm text-surface-500 dark:text-surface-400">
        登录后即可继续进入工作区、项目和审阅流程。
      </p>

      <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
        <Input
          label="邮箱地址"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          autoComplete="email"
        />
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="block text-sm font-medium text-surface-700 dark:text-surface-300">密码</label>
            <Link to="/forgot-password" className="text-xs text-brand-600 hover:text-brand-700 dark:text-brand-400">
              忘记密码？
            </Link>
          </div>
          <div className="relative">
            <Input
              type={showPassword ? 'text' : 'password'}
              placeholder="输入密码"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              className="pr-11"
            />
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-surface-400 hover:bg-surface-100 hover:text-surface-700 dark:hover:bg-surface-800 dark:hover:text-surface-200"
              onClick={() => setShowPassword((current) => !current)}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        {formError || error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/10 dark:text-red-300">
            {formError || error}
          </div>
        ) : null}

        <Button type="submit" fullWidth loading={isLoading}>
          登录
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-surface-500 dark:text-surface-400">
        还没有账号？{' '}
        <Link to="/register" className="font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400">
          注册
        </Link>
      </p>
    </div>
  );
}
