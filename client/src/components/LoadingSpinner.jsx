import { Loader2 } from 'lucide-react';
import clsx from 'clsx';

const sizeMap = {
  sm: 'h-5 w-5',
  md: 'h-8 w-8',
  lg: 'h-12 w-12',
};

export default function LoadingSpinner({ size = 'md', text, className }) {
  return (
    <div className={clsx('flex flex-col items-center justify-center gap-3', className)}>
      <Loader2 className={clsx('animate-spin text-brand-500', sizeMap[size])} />
      {text && <p className="text-sm text-surface-500 dark:text-surface-400">{text}</p>}
    </div>
  );
}
