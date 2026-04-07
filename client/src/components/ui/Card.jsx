import clsx from 'clsx';

function Card({
  children,
  header,
  footer,
  hover = false,
  clickable = false,
  padding = true,
  className,
  ...props
}) {
  const Component = clickable ? 'button' : 'div';
  const clickableProps = clickable
    ? { type: 'button', onClick: props.onClick }
    : {};

  return (
    <Component
      className={clsx(
        'rounded-lg border border-surface-200 bg-white dark:border-surface-700 dark:bg-surface-800',
        'transition-all duration-200',
        hover && 'hover:shadow-md hover:border-surface-300 dark:hover:border-surface-600',
        clickable && 'cursor-pointer hover:shadow-md hover:border-brand-300 dark:hover:border-brand-700',
        className
      )}
      {...clickableProps}
    >
      {header && (
        <div className="border-b border-surface-200 px-5 py-4 dark:border-surface-700">
          {typeof header === 'string' ? (
            <h3 className="text-sm font-semibold text-surface-900 dark:text-surface-100">
              {header}
            </h3>
          ) : (
            header
          )}
        </div>
      )}
      <div className={clsx(padding && 'p-5')}>{children}</div>
      {footer && (
        <div className="border-t border-surface-200 px-5 py-4 dark:border-surface-700">
          {footer}
        </div>
      )}
    </Component>
  );
}

Card.Body = function CardBody({ children, className }) {
  return <div className={className}>{children}</div>;
};

export default Card;
