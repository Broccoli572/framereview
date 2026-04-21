import clsx from 'clsx';

function Skeleton({ className, ...props }) {
  return (
    <div
      className={clsx(
        'animate-pulse rounded-2xl bg-surface-200/80 dark:bg-surface-800/80',
        className
      )}
      {...props}
    />
  );
}

export default Skeleton;
