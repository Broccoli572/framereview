import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { forgotPassword } from '../api/auth';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const mutation = useMutation({
    mutationFn: () => forgotPassword({ email: email.trim() }),
    onSuccess: () => {
      setSubmitted(true);
      setError('');
    },
    onError: (requestError) => {
      setError(requestError.response?.data?.message || '发送重置邮件失败，请稍后再试。');
    },
  });

  if (submitted) {
    return (
      <div>
        <p className="text-sm font-medium text-surface-500 dark:text-surface-400">邮件已发送</p>
        <h2 className="mt-2 text-3xl font-semibold tracking-tight">检查你的收件箱</h2>
        <p className="mt-3 text-sm leading-6 text-surface-500 dark:text-surface-400">
          如果账号存在，重置密码的邮件会发送到 <span className="font-medium text-surface-900 dark:text-surface-100">{email}</span>。
        </p>
        <div className="mt-8">
          <Link to="/login" className="text-sm font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400">
            返回登录
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      <p className="text-sm font-medium text-surface-500 dark:text-surface-400">找回密码</p>
      <h2 className="mt-2 text-3xl font-semibold tracking-tight">重置你的登录密码</h2>
      <p className="mt-2 text-sm text-surface-500 dark:text-surface-400">
        输入注册邮箱，我们会发送密码重置邮件。
      </p>

      <form
        className="mt-8 space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          if (!email.trim()) {
            setError('请输入邮箱地址。');
            return;
          }
          setError('');
          mutation.mutate();
        }}
      >
        <Input
          label="邮箱地址"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          autoComplete="email"
        />

        {error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/10 dark:text-red-300">
            {error}
          </div>
        ) : null}

        <Button type="submit" fullWidth loading={mutation.isPending}>
          发送重置邮件
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-surface-500 dark:text-surface-400">
        <Link to="/login" className="font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400">
          返回登录
        </Link>
      </p>
    </div>
  );
}
