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
        'rounded-[24px] border border-surface-200 bg-white shadow-sm dark:border-surface-800 dark:bg-surface-900',
        'transition-all duration-200 ease-out',
        hover && 'hover:-translate-y-0.5 hover:border-surface-300 hover:shadow-lg dark:hover:border-surface-700',
        clickable && 'cursor-pointer',
        className
      )}
      {...clickableProps}
    >
      {header ? (
        <div className="border-b border-surface-200 px-5 py-4 dark:border-surface-800">
          {typeof header === 'string' ? (
            <h3 className="text-sm font-semibold text-surface-900 dark:text-surface-100">{header}</h3>
          ) : (
            header
          )}
        </div>
      ) : null}
      <div className={clsx(padding && 'p-5')}>{children}</div>
      {footer ? (
        <div className="border-t border-surface-200 px-5 py-4 dark:border-surface-800">
          {footer}
        </div>
      ) : null}
    </Component>
  );
}

Card.Body = function CardBody({ children, className }) {
  return <div className={className}>{children}</div>;
};

export default Card;
