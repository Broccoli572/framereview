import { startTransition, useDeferredValue, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, FolderOpen, Layers3, Search as SearchIcon, Sparkles, X } from 'lucide-react';
import clsx from 'clsx';
import { search } from '../api/search';
import Badge from '../components/ui/Badge';
import EmptyState from '../components/ui/EmptyState';
import Input from '../components/ui/Input';
import Skeleton from '../components/ui/Skeleton';
import { normalizeSearchResults } from '../lib/view-models';

function SearchResultCard({ item, onOpen }) {
  return (
    <button
      type="button"
      onClick={() => onOpen(item)}
      className="flex w-full items-center gap-4 rounded-[22px] border border-surface-200 bg-white px-4 py-4 text-left transition-colors hover:border-surface-300 hover:bg-surface-50 dark:border-surface-800 dark:bg-surface-900 dark:hover:border-surface-700 dark:hover:bg-surface-950"
    >
      <div className="flex h-14 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-surface-100 dark:bg-surface-950">
        {item.thumbnailUrl ? (
          <img src={item.thumbnailUrl} alt={item.title} className="h-full w-full object-cover" />
        ) : item.type === 'project' ? (
          <Layers3 size={20} className="text-surface-400" />
        ) : (
          <FolderOpen size={20} className="text-surface-400" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate text-sm font-semibold">{item.title}</p>
          {item.statusLabel ? <Badge variant={item.statusVariant}>{item.statusLabel}</Badge> : null}
        </div>
        <p className="mt-1 text-sm text-surface-500 dark:text-surface-400">{item.subtitle}</p>
        {item.meta ? <p className="mt-2 text-xs text-surface-400">{item.meta}</p> : null}
      </div>

      <div className="hidden items-center gap-2 text-sm text-surface-500 dark:text-surface-400 md:flex">
        <span>{item.contextLabel}</span>
        <ArrowRight size={14} />
      </div>
    </button>
  );
}

function SearchResultsSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, index) => (
        <div
          key={index}
          className="flex items-center gap-4 rounded-[22px] border border-surface-200 bg-white px-4 py-4 dark:border-surface-800 dark:bg-surface-900"
        >
          <Skeleton className="h-14 w-20 rounded-2xl" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-40 rounded-lg" />
            <Skeleton className="h-3 w-64 rounded-lg" />
            <Skeleton className="h-3 w-28 rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function SearchPage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const deferredQuery = useDeferredValue(query.trim());

  const searchQuery = useQuery({
    queryKey: ['search', deferredQuery, activeTab],
    queryFn: async () => {
      if (!deferredQuery) return null;

      const response = await search({
        q: deferredQuery,
        type: activeTab === 'all' ? undefined : activeTab,
      });
      return response.data?.data || response.data || {};
    },
    enabled: Boolean(deferredQuery),
  });

  const normalized = useMemo(() => normalizeSearchResults(searchQuery.data || {}), [searchQuery.data]);
  const currentResults = activeTab === 'all'
    ? normalized.all
    : activeTab === 'asset'
      ? normalized.assets
      : activeTab === 'project'
        ? normalized.projects
        : normalized.folders;

  const tabs = [
    { key: 'all', label: '全部', count: normalized.all.length },
    { key: 'asset', label: '素材', count: normalized.assets.length },
    { key: 'project', label: '项目', count: normalized.projects.length },
    { key: 'folder', label: '文件夹', count: normalized.folders.length },
  ];

  const isSearching = Boolean(deferredQuery) && searchQuery.isFetching;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <section className="rounded-[28px] border border-surface-200 bg-white p-6 shadow-sm dark:border-surface-800 dark:bg-surface-900 lg:p-8">
        <p className="text-sm font-medium text-surface-500 dark:text-surface-400">搜索</p>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight">快速定位。</h2>
        <p className="mt-3 text-sm text-surface-500 dark:text-surface-400">
          素材、项目、文件夹。
        </p>

        <div className="relative mt-6">
          <Input
            placeholder="输入名称"
            value={query}
            onChange={(event) => {
              const value = event.target.value;
              startTransition(() => {
                setQuery(value);
              });
            }}
            leftIcon={SearchIcon}
            className="pr-11"
            autoFocus
          />
          {query ? (
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-surface-400 hover:bg-surface-100 hover:text-surface-700 dark:hover:bg-surface-800 dark:hover:text-surface-200"
              onClick={() => setQuery('')}
              aria-label="清空搜索"
            >
              <X size={16} />
            </button>
          ) : null}
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={clsx(
                'inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm transition-colors',
                activeTab === tab.key
                  ? 'bg-surface-900 text-white dark:bg-surface-100 dark:text-surface-900'
                  : 'bg-surface-100 text-surface-600 hover:bg-surface-200 dark:bg-surface-800 dark:text-surface-300 dark:hover:bg-surface-700'
              )}
            >
              <span>{tab.label}</span>
              <span className="text-xs opacity-80">{tab.count}</span>
            </button>
          ))}
        </div>
      </section>

      {!deferredQuery && !searchQuery.isLoading ? (
        <EmptyState
          icon={Sparkles}
          title="开始搜索"
          description="输入名称后查看结果。"
        />
      ) : null}

      {isSearching ? <SearchResultsSkeleton /> : null}

      {deferredQuery && !isSearching && currentResults.length === 0 ? (
        <EmptyState
          icon={SearchIcon}
          title="没有结果"
          description={`未找到“${deferredQuery}”相关内容。`}
          actionLabel="清空"
          onAction={() => setQuery('')}
        />
      ) : null}

      {deferredQuery && !isSearching && currentResults.length > 0 ? (
        <section className="space-y-4">
          <div className="flex items-end justify-between gap-3">
            <h3 className="text-lg font-semibold">结果</h3>
            <p className="text-sm text-surface-400">{currentResults.length}</p>
          </div>

          <div className="space-y-3">
            {currentResults.map((item) => (
              <SearchResultCard
                key={`${item.type}-${item.id}`}
                item={item}
                onOpen={(result) => {
                  if (result.href) {
                    navigate(result.href);
                  }
                }}
              />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
