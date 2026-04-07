import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Search as SearchIcon, Film, FolderOpen, X, ArrowRight
} from 'lucide-react';
import client from '../api/client';
import Input from '../components/ui/Input';
import Spinner from '../components/ui/Spinner';
import EmptyState from '../components/ui/EmptyState';
import Badge from '../components/ui/Badge';
import Avatar from '../components/ui/Avatar';
import { formatDuration, formatBytes, formatRelativeTime } from '../lib/utils';
import clsx from 'clsx';

function ResultCard({ item, type, onClick }) {
  if (type === 'assets') {
    return (
      <div
        onClick={onClick}
        className="flex items-center gap-3 rounded-lg p-3 cursor-pointer transition-colors hover:bg-surface-100 dark:hover:bg-surface-800"
      >
        <div className="h-12 w-20 flex-shrink-0 rounded-md bg-surface-200 dark:bg-surface-700 overflow-hidden">
          {item.thumbnail_url ? (
            <img src={item.thumbnail_url} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center">
              <Film size={16} className="text-surface-400" />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-surface-900 dark:text-surface-100 truncate">
            {item.name || item.file_name}
          </p>
          <div className="mt-0.5 flex items-center gap-2 text-xs text-surface-500">
            {item.project?.name && <span>{item.project.name}</span>}
            {item.duration && <span>{formatDuration(item.duration)}</span>}
            {item.size && <span>{formatBytes(item.size)}</span>}
          </div>
        </div>
        <ArrowRight size={14} className="text-surface-400 flex-shrink-0" />
      </div>
    );
  }

  if (type === 'projects') {
    return (
      <div
        onClick={onClick}
        className="flex items-center gap-3 rounded-lg p-3 cursor-pointer transition-colors hover:bg-surface-100 dark:hover:bg-surface-800"
      >
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
          <FolderOpen size={18} className="text-emerald-600 dark:text-emerald-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-surface-900 dark:text-surface-100 truncate">{item.name}</p>
          <div className="mt-0.5 flex items-center gap-2 text-xs text-surface-500">
            <span>{item.assets_count ?? 0} 资源</span>
            {item.workspace?.name && <span>· {item.workspace.name}</span>}
          </div>
        </div>
        <ArrowRight size={14} className="text-surface-400 flex-shrink-0" />
      </div>
    );
  }

  if (type === 'folders') {
    return (
      <div
        onClick={onClick}
        className="flex items-center gap-3 rounded-lg p-3 cursor-pointer transition-colors hover:bg-surface-100 dark:hover:bg-surface-800"
      >
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/30">
          <FolderOpen size={18} className="text-amber-600 dark:text-amber-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-surface-900 dark:text-surface-100 truncate">{item.name}</p>
          <div className="mt-0.5 flex items-center gap-2 text-xs text-surface-500">
            <span>{item.assets_count ?? 0} 资源</span>
          </div>
        </div>
        <ArrowRight size={14} className="text-surface-400 flex-shrink-0" />
      </div>
    );
  }

  return null;
}

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [activeType, setActiveType] = useState('all');
  const navigate = useNavigate();

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  const { data: results, isLoading } = useQuery({
    queryKey: ['search', debouncedQuery, activeType],
    queryFn: async () => {
      if (!debouncedQuery.trim()) return null;
      const params = new URLSearchParams({ q: debouncedQuery });
      if (activeType !== 'all') params.set('type', activeType);
      const res = await client.get(`/search?${params}`);
      return res.data?.data || res.data || {};
    },
    enabled: !!debouncedQuery.trim(),
  });

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      setQuery('');
      setDebouncedQuery('');
    }
  };

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const assets = results?.assets || [];
  const projects = results?.projects || [];
  const folders = results?.folders || [];
  const totalResults = assets.length + projects.length + folders.length;

  const typeTabs = [
    { key: 'all', label: '全部' },
    { key: 'assets', label: '资源' },
    { key: 'projects', label: '项目' },
    { key: 'folders', label: '文件夹' },
  ];

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-surface-900 dark:text-surface-100">搜索</h1>
        <p className="mt-1 text-sm text-surface-500 dark:text-surface-400">
          搜索项目、资源和文件夹
        </p>
      </div>

      {/* Search input */}
      <div className="mb-4 relative">
        <Input
          placeholder="搜索..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          leftIcon={SearchIcon}
          autoFocus
          className="pl-10"
        />
        {query && (
          <button
            onClick={() => setQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 hover:text-surface-600"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* Type filter */}
      {debouncedQuery && (
        <div className="flex gap-2 mb-6">
          {typeTabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveType(tab.key)}
              className={clsx(
                'rounded-full px-3 py-1 text-sm font-medium transition-colors',
                activeType === tab.key
                  ? 'bg-brand-100 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300'
                  : 'bg-surface-100 text-surface-500 hover:bg-surface-200 dark:bg-surface-800 dark:text-surface-400 dark:hover:bg-surface-700'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Spinner text="搜索中..." />
        </div>
      )}

      {/* No query */}
      {!debouncedQuery && !isLoading && (
        <EmptyState
          icon={SearchIcon}
          title="输入关键词搜索"
          description="搜索项目名称、资源文件名或其他内容"
        />
      )}

      {/* Results */}
      {debouncedQuery && !isLoading && results && totalResults === 0 && (
        <EmptyState
          icon={SearchIcon}
          title="未找到结果"
          description={`没有与「${debouncedQuery}」匹配的内容`}
        />
      )}

      {debouncedQuery && !isLoading && results && totalResults > 0 && (
        <div className="space-y-6">
          <p className="text-sm text-surface-500">
            找到 {totalResults} 个结果
          </p>

          {/* Assets */}
          {(activeType === 'all' || activeType === 'assets') && assets.length > 0 && (
            <div>
              <h3 className="mb-2 text-sm font-semibold text-surface-700 dark:text-surface-300">
                资源 ({assets.length})
              </h3>
              <div className="space-y-1">
                {assets.map((item) => (
                  <ResultCard
                    key={item.id}
                    item={item}
                    type="assets"
                    onClick={() => item.id && navigate(`/review/${item.id}`)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Projects */}
          {(activeType === 'all' || activeType === 'projects') && projects.length > 0 && (
            <div>
              <h3 className="mb-2 text-sm font-semibold text-surface-700 dark:text-surface-300">
                项目 ({projects.length})
              </h3>
              <div className="space-y-1">
                {projects.map((item) => (
                  <ResultCard
                    key={item.id}
                    item={item}
                    type="projects"
                    onClick={() => item.id && navigate(`/project/${item.id}`)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Folders */}
          {(activeType === 'all' || activeType === 'folders') && folders.length > 0 && (
            <div>
              <h3 className="mb-2 text-sm font-semibold text-surface-700 dark:text-surface-300">
                文件夹 ({folders.length})
              </h3>
              <div className="space-y-1">
                {folders.map((item) => (
                  <ResultCard
                    key={item.id}
                    item={item}
                    type="folders"
                    onClick={() => item.project_id && navigate(`/project/${item.project_id}`)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
