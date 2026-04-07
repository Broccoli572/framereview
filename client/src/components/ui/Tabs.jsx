import { useState, useCallback, useRef, useEffect } from 'react';
import clsx from 'clsx';

function Tabs({
  tabs = [],
  activeKey,
  onChange,
  className,
  tabClassName,
  contentClassName,
  routerAware = false,
}) {
  const [internalActive, setInternalActive] = useState(tabs[0]?.key);
  const activeKey_ = activeKey !== undefined ? activeKey : internalActive;
  const activeTab = tabs.find((t) => t.key === activeKey_);
  const tabListRef = useRef(null);
  const indicatorRef = useRef(null);

  const handleChange = useCallback(
    (key) => {
      if (activeKey === undefined) {
        setInternalActive(key);
      }
      onChange?.(key);
    },
    [activeKey, onChange]
  );

  useEffect(() => {
    if (!tabListRef.current || !indicatorRef.current) return;
    const activeElement = tabListRef.current.querySelector(`[data-tab-key="${activeKey_}"]`);
    if (activeElement) {
      indicatorRef.current.style.width = `${activeElement.offsetWidth}px`;
      indicatorRef.current.style.left = `${activeElement.offsetLeft}px`;
    }
  }, [activeKey_]);

  const handleKeyDown = useCallback(
    (e) => {
      const enabledTabs = tabs.filter((t) => !t.disabled);
      const currentIdx = enabledTabs.findIndex((t) => t.key === activeKey_);
      let nextIdx = currentIdx;

      if (e.key === 'ArrowRight') {
        nextIdx = (currentIdx + 1) % enabledTabs.length;
      } else if (e.key === 'ArrowLeft') {
        nextIdx = (currentIdx - 1 + enabledTabs.length) % enabledTabs.length;
      } else if (e.key === 'Home') {
        nextIdx = 0;
      } else if (e.key === 'End') {
        nextIdx = enabledTabs.length - 1;
      } else {
        return;
      }

      e.preventDefault();
      const nextTab = enabledTabs[nextIdx];
      if (nextTab) {
        handleChange(nextTab.key);
        tabListRef.current
          ?.querySelector(`[data-tab-key="${nextTab.key}"]`)
          ?.focus();
      }
    },
    [tabs, activeKey_, handleChange]
  );

  return (
    <div className={className}>
      <div
        ref={tabListRef}
        role="tablist"
        aria-label="Tabs"
        onKeyDown={handleKeyDown}
        className="relative flex border-b border-surface-200 dark:border-surface-700"
      >
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            role="tab"
            data-tab-key={tab.key}
            aria-selected={tab.key === activeKey_}
            aria-controls={`tabpanel-${tab.key}`}
            tabIndex={tab.key === activeKey_ ? 0 : -1}
            disabled={tab.disabled}
            onClick={() => handleChange(tab.key)}
            className={clsx(
              'relative px-4 py-2.5 text-sm font-medium transition-colors duration-200',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2',
              'dark:focus-visible:ring-offset-surface-900',
              tab.disabled
                ? 'cursor-not-allowed text-surface-300 dark:text-surface-600'
                : tab.key === activeKey_
                ? 'text-brand-600 dark:text-brand-400'
                : 'text-surface-500 hover:text-surface-700 dark:text-surface-400 dark:hover:text-surface-200',
              tabClassName
            )}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span
                className={clsx(
                  'ml-2 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium',
                  tab.key === activeKey_
                    ? 'bg-brand-100 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300'
                    : 'bg-surface-100 text-surface-500 dark:bg-surface-700 dark:text-surface-400'
                )}
              >
                {tab.count}
              </span>
            )}
          </button>
        ))}
        <div
          ref={indicatorRef}
          className="absolute bottom-0 h-0.5 bg-brand-600 dark:bg-brand-400 transition-all duration-200"
          aria-hidden="true"
        />
      </div>
      {activeTab?.content && (
        <div
          role="tabpanel"
          id={`tabpanel-${activeKey_}`}
          aria-labelledby={`tab-${activeKey_}`}
          className={clsx('pt-4', contentClassName)}
        >
          {activeTab.content}
        </div>
      )}
    </div>
  );
}

export default Tabs;
