import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { register } from '../api/auth';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';

export default function RegisterPage() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    password_confirmation: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!form.name.trim()) {
      setError('请输入你的姓名。');
      return;
    }
    if (!form.email.trim()) {
      setError('请输入邮箱地址。');
      return;
    }
    if (form.password.length < 8) {
      setError('密码长度至少为 8 位。');
      return;
    }
    if (form.password !== form.password_confirmation) {
      setError('两次输入的密码不一致。');
      return;
    }

    setError('');
    setLoading(true);
    try {
      await register(form);
      navigate('/login', { replace: true });
    } catch (requestError) {
      setError(requestError.response?.data?.message || '注册失败，请稍后再试。');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <p className="text-sm font-medium text-surface-500 dark:text-surface-400">创建账号</p>
      <h2 className="mt-2 text-3xl font-semibold tracking-tight">开始你的协作工作流</h2>
      <p className="mt-2 text-sm text-surface-500 dark:text-surface-400">
        注册完成后，即可进入工作台开始创建工作区和项目。
      </p>

      <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
        <Input
          label="姓名"
          placeholder="你的姓名"
          value={form.name}
          onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
          autoComplete="name"
        />
        <Input
          label="邮箱地址"
          type="email"
          placeholder="you@example.com"
          value={form.email}
          onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
          autoComplete="email"
        />

        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-surface-700 dark:text-surface-300">密码</label>
          <div className="relative">
            <Input
              type={showPassword ? 'text' : 'password'}
              placeholder="至少 8 位"
              value={form.password}
              onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
              autoComplete="new-password"
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

        <Input
          label="确认密码"
          type="password"
          placeholder="再次输入密码"
          value={form.password_confirmation}
          onChange={(event) => setForm((current) => ({ ...current, password_confirmation: event.target.value }))}
          autoComplete="new-password"
        />

        {error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/10 dark:text-red-300">
            {error}
          </div>
        ) : null}

        <Button type="submit" fullWidth loading={loading}>
          注册
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-surface-500 dark:text-surface-400">
        已有账号？{' '}
        <Link to="/login" className="font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400">
          去登录
        </Link>
      </p>
    </div>
  );
}
