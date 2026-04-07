import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { forgotPassword as forgotPasswordApi } from '../api/auth';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import { Film, Mail, ArrowLeft, CheckCircle } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const mutation = useMutation({
    mutationFn: () => forgotPasswordApi({ email }),
    onSuccess: () => setSent(true),
    onError: (err) => {
      setError(err.response?.data?.message || '发送失败，请稍后重试');
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('请输入有效的邮箱地址');
      return;
    }
    setError('');
    mutation.mutate();
  };

  if (sent) {
    return (
      <div className="card p-8 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-900/30">
          <CheckCircle size={24} className="text-emerald-600 dark:text-emerald-400" />
        </div>
        <h1 className="text-xl font-bold text-surface-900 dark:text-surface-100">邮件已发送</h1>
        <p className="mt-2 text-sm text-surface-500 dark:text-surface-400">
          密码重置链接已发送至 <span className="font-medium text-surface-700 dark:text-surface-300">{email}</span>，请检查你的收件箱。
        </p>
        <Link
          to="/login"
          className="mt-6 inline-flex items-center gap-1.5 text-sm text-brand-600 hover:text-brand-700 dark:text-brand-400"
        >
          <ArrowLeft size={14} />
          返回登录
        </Link>
      </div>
    );
  }

  return (
    <div className="card p-8">
      <div className="mb-6 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-100 dark:bg-brand-900/30">
          <Film size={24} className="text-brand-600 dark:text-brand-400" />
        </div>
        <h1 className="text-xl font-bold text-surface-900 dark:text-surface-100">忘记密码</h1>
        <p className="mt-1 text-sm text-surface-500 dark:text-surface-400">
          输入你的邮箱地址，我们将发送密码重置链接
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="邮箱地址"
          type="email"
          placeholder="name@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          leftIcon={Mail}
          autoComplete="email"
        />
        <Button type="submit" fullWidth loading={mutation.isPending} size="lg">
          发送重置链接
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-surface-500 dark:text-surface-400">
        <Link to="/login" className="inline-flex items-center gap-1.5 font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400">
          <ArrowLeft size={14} />
          返回登录
        </Link>
      </p>
    </div>
  );
}
