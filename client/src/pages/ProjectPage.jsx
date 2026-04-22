import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Film,
  FolderPlus,
  Grid3X3,
  List,
  RefreshCw,
  Search,
  Trash2,
  Upload,
} from 'lucide-react';
import clsx from 'clsx';
import client from '../api/client';
import { deleteAsset, processAsset } from '../api/assets';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import EmptyState from '../components/ui/EmptyState';
import Input from '../components/ui/Input';
import Modal from '../components/ui/Modal';
import Skeleton from '../components/ui/Skeleton';
import Spinner from '../components/ui/Spinner';
import Table, { Body, Cell, Head, HeaderCell, Row } from '../components/ui/Table';
import { normalizeAsset } from '../lib/view-models';

function FolderTreeNode({ folder, selectedFolderId, onSelect, depth = 0 }) {
  const [expanded, setExpanded] = useState(depth < 1);
  const hasChildren = folder.children?.length > 0;
  const isActive = selectedFolderId === folder.id;

  return (
    <div>
      <button
        type="button"
        className={clsx(
          'flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm transition-colors',
          isActive
            ? 'bg-surface-900 text-white dark:bg-surface-100 dark:text-surface-900'
            : 'text-surface-600 hover:bg-surface-100 dark:text-surface-400 dark:hover:bg-surface-800'
        )}
        style={{ paddingLeft: `${depth * 16 + 12}px` }}
        onClick={() => {
          onSelect(folder.id);
          if (hasChildren) {
            setExpanded((current) => !current);
          }
        }}
      >
        {hasChildren ? (
          expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />
        ) : (
          <span className="w-[14px]" />
        )}
        <span className="truncate">{folder.name}</span>
        <span className="ml-auto text-xs opacity-70">{folder.assetCount ?? folder.assets_count ?? 0}</span>
      </button>

      {hasChildren && expanded ? (
        <div className="mt-1 space-y-1">
          {folder.children.map((child) => (
            <FolderTreeNode
              key={child.id}
              folder={child}
              selectedFolderId={selectedFolderId}
              onSelect={onSelect}
              depth={depth + 1}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function AssetCard({ asset, onOpen, onRetry, onDelete }) {
  const mediaTypeLabel = {
    video: '视频',
    audio: '音频',
    image: '图片',
    document: '文档',
    other: '素材',
  };

  return (
    <button
      type="button"
      onClick={() => onOpen(asset)}
      className="group flex h-full flex-col overflow-hidden rounded-[24px] border border-surface-200 bg-white text-left transition-all duration-200 hover:-translate-y-1 hover:border-surface-300 hover:shadow-xl dark:border-surface-800 dark:bg-surface-900 dark:hover:border-surface-700"
    >
      <div className="relative aspect-video overflow-hidden bg-surface-100 dark:bg-surface-950">
        {asset.thumbnailUrl ? (
          <img
            src={asset.thumbnailUrl}
            alt={asset.name}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-surface-400">
            <Film size={30} />
          </div>
        )}

        <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-2 px-3 pt-3">
          <span className="rounded-full bg-black/55 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur">
            {mediaTypeLabel[asset.mediaType] || '素材'}
          </span>
          <button
            type="button"
            className="rounded-full bg-black/50 p-2 text-white opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100"
            onClick={(event) => {
              event.stopPropagation();
              if (window.confirm(`确定删除“${asset.name}”吗？`)) {
                onDelete(asset);
              }
            }}
            aria-label={`删除 ${asset.name}`}
          >
            <Trash2 size={13} />
          </button>
        </div>

        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent px-3 pb-3 pt-10 text-white">
          <div className="flex items-center justify-between gap-2">
            <Badge variant={asset.statusVariant}>{asset.statusLabel}</Badge>
            <span className="text-xs font-medium">{asset.durationLabel}</span>
          </div>
        </div>
      </div>

      <div className="flex flex-1 flex-col px-4 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{asset.name}</p>
            <p className="mt-1 text-xs text-surface-500 dark:text-surface-400">
              {asset.sizeLabel}
              {asset.folderName ? ` · ${asset.folderName}` : ''}
            </p>
          </div>
          <span className="rounded-full bg-surface-100 px-2.5 py-1 text-[11px] font-medium text-surface-500 dark:bg-surface-800 dark:text-surface-300">
            {asset.updatedLabel}
          </span>
        </div>

        <p className="mt-3 text-xs text-surface-500 dark:text-surface-400">{asset.statusDescription}</p>

        <div className="mt-auto flex translate-y-0 items-center gap-2 pt-4 opacity-100 transition-all duration-200 md:translate-y-1 md:opacity-0 md:group-hover:translate-y-0 md:group-hover:opacity-100">
          <Button
            size="sm"
            variant="secondary"
            className="flex-1"
            onClick={(event) => {
              event.stopPropagation();
              onOpen(asset);
            }}
          >
            打开
          </Button>

          {asset.canRetry ? (
            <Button
              size="sm"
              variant="secondary"
              leftIcon={RefreshCw}
              onClick={(event) => {
                event.stopPropagation();
                onRetry(asset);
              }}
            >
              重试
            </Button>
          ) : null}
        </div>
      </div>
    </button>
  );
}

function ProjectSidebarSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-5 w-24 rounded-lg" />
      <Skeleton className="h-24 w-full rounded-2xl" />
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, index) => (
          <Skeleton key={index} className="h-10 w-full rounded-xl" />
        ))}
      </div>
    </div>
  );
}

function AssetGridSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <div
          key={index}
          className="overflow-hidden rounded-[24px] border border-surface-200 bg-white dark:border-surface-800 dark:bg-surface-900"
        >
          <Skeleton className="aspect-video w-full rounded-none" />
          <div className="space-y-3 p-4">
            <Skeleton className="h-4 w-2/3 rounded-lg" />
            <Skeleton className="h-3 w-1/2 rounded-lg" />
            <div className="flex gap-2">
              <Skeleton className="h-8 flex-1 rounded-xl" />
              <Skeleton className="h-8 w-20 rounded-xl" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function ProjectPage() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedFolderId, setSelectedFolderId] = useState(null);
  const [viewMode, setViewMode] = useState('grid');
  const [mediaType, setMediaType] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortValue, setSortValue] = useState('updated_at-desc');
  const [searchValue, setSearchValue] = useState('');
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const deferredSearch = useDeferredValue(searchValue);

  const projectQuery = useQuery({
    queryKey: ['project', projectId],
    queryFn: async () => {
      const response = await client.get(`/projects/${projectId}`);
      return response.data?.data || response.data || null;
    },
    enabled: Boolean(projectId),
  });

  const folderTreeQuery = useQuery({
    queryKey: ['project-folders-tree', projectId],
    queryFn: async () => {
      const response = await client.get(`/projects/${projectId}/folders/tree`);
      return response.data?.data || response.data || [];
    },
    enabled: Boolean(projectId),
  });

  const assetsQuery = useQuery({
    queryKey: ['project-assets', projectId, selectedFolderId, mediaType, statusFilter, sortValue, deferredSearch],
    queryFn: async () => {
      const [sort, order] = sortValue.split('-');
      const params = new URLSearchParams({ sort, order });

      if (selectedFolderId) params.set('folder_id', selectedFolderId);
      if (mediaType !== 'all') params.set('type', mediaType);
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (deferredSearch.trim()) params.set('search', deferredSearch.trim());

      const response = await client.get(`/projects/${projectId}/assets?${params.toString()}`);
      const payload = response.data?.data || response.data || [];
      const items = Array.isArray(payload) ? payload : payload.data || [];
      return items.map(normalizeAsset);
    },
    enabled: Boolean(projectId),
  });

  const createFolderMutation = useMutation({
    mutationFn: () => client.post(`/projects/${projectId}/folders`, { name: newFolderName.trim(), parent_id: selectedFolderId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-folders-tree', projectId] });
      setShowCreateFolder(false);
      setNewFolderName('');
    },
  });

  const deleteAssetMutation = useMutation({
    mutationFn: (assetId) => deleteAsset(assetId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-assets', projectId] });
    },
  });

  const retryProcessingMutation = useMutation({
    mutationFn: (assetId) => processAsset(assetId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-assets', projectId] });
    },
  });

  const assets = assetsQuery.data || [];
  const counts = useMemo(
    () => assets.reduce(
      (summary, asset) => {
        summary.total += 1;
        summary[asset.status] = (summary[asset.status] || 0) + 1;
        return summary;
      },
      { total: 0, processing: 0, ready: 0, failed: 0, uploading: 0 }
    ),
    [assets]
  );

  const hasProcessingAssets = assets.some((asset) => asset.isProcessing);
  const hasActiveFilters = Boolean(
    selectedFolderId || deferredSearch.trim() || mediaType !== 'all' || statusFilter !== 'all'
  );

  const statusChips = [
    { key: 'all', label: '全部', count: counts.total },
    { key: 'ready', label: '可审阅', count: counts.ready || 0 },
    { key: 'processing', label: '处理中', count: counts.processing || 0 },
    { key: 'failed', label: '失败', count: counts.failed || 0 },
    { key: 'uploading', label: '上传中', count: counts.uploading || 0 },
  ];

  useEffect(() => {
    if (!hasProcessingAssets) return undefined;

    const timer = window.setInterval(() => {
      queryClient.invalidateQueries({ queryKey: ['project-assets', projectId] });
    }, 4000);

    return () => window.clearInterval(timer);
  }, [hasProcessingAssets, projectId, queryClient]);

  return (
    <div className="grid min-h-[calc(100vh-10rem)] gap-6 xl:grid-cols-[280px_minmax(0,1fr)]">
      <aside className="order-2 rounded-[26px] border border-surface-200 bg-white p-4 shadow-sm dark:border-surface-800 dark:bg-surface-900 xl:order-1 xl:sticky xl:top-24 xl:h-fit">
        {projectQuery.isLoading || folderTreeQuery.isLoading ? (
          <ProjectSidebarSkeleton />
        ) : (
          <>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-surface-400">目录</p>
                <h3 className="mt-1 text-base font-semibold">文件夹</h3>
              </div>
              <Button size="sm" variant="secondary" leftIcon={FolderPlus} onClick={() => setShowCreateFolder(true)}>
                新建
              </Button>
            </div>

            <div className="mt-4 rounded-2xl bg-surface-50 p-4 dark:bg-surface-950">
              <p className="text-sm font-medium">{projectQuery.data?.name || '项目'}</p>
              {projectQuery.data?.description ? (
                <p className="mt-2 text-xs text-surface-500 dark:text-surface-400">{projectQuery.data.description}</p>
              ) : null}
            </div>

            <div className="mt-4 space-y-1">
              <button
                type="button"
                className={clsx(
                  'flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm transition-colors',
                  !selectedFolderId
                    ? 'bg-surface-900 text-white dark:bg-surface-100 dark:text-surface-900'
                    : 'text-surface-600 hover:bg-surface-100 dark:text-surface-400 dark:hover:bg-surface-800'
                )}
                onClick={() => setSelectedFolderId(null)}
              >
                <span>全部素材</span>
                <span className="text-xs opacity-70">{counts.total}</span>
              </button>

              {(folderTreeQuery.data || []).length ? (
                <div className="space-y-1">
                  {(folderTreeQuery.data || []).map((folder) => (
                    <FolderTreeNode
                      key={folder.id}
                      folder={folder}
                      selectedFolderId={selectedFolderId}
                      onSelect={setSelectedFolderId}
                    />
                  ))}
                </div>
              ) : (
                <EmptyState
                  compact
                  title="还没有文件夹"
                  description="可直接上传。"
                />
              )}
            </div>
          </>
        )}
      </aside>

      <section className="order-1 space-y-6 xl:order-2">
        <div className="rounded-[26px] border border-surface-200 bg-white p-5 shadow-sm dark:border-surface-800 dark:bg-surface-900">
          <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-sm font-medium text-surface-500 dark:text-surface-400">项目</p>
                <h2 className="mt-2 text-2xl font-semibold">{projectQuery.data?.name || '项目'}</h2>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button leftIcon={Upload} onClick={() => navigate(`/project/${projectId}/upload`)}>
                  上传素材
                </Button>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              <div className="rounded-2xl bg-surface-50 p-4 dark:bg-surface-950">
                <p className="text-sm text-surface-500 dark:text-surface-400">全部</p>
                <p className="mt-2 text-2xl font-semibold">{counts.total}</p>
              </div>
              <div className="rounded-2xl bg-surface-50 p-4 dark:bg-surface-950">
                <p className="text-sm text-surface-500 dark:text-surface-400">可审阅</p>
                <p className="mt-2 text-2xl font-semibold">{counts.ready || 0}</p>
              </div>
              <div className="rounded-2xl bg-surface-50 p-4 dark:bg-surface-950">
                <p className="text-sm text-surface-500 dark:text-surface-400">处理中</p>
                <p className="mt-2 text-2xl font-semibold">{counts.processing || 0}</p>
              </div>
              <div className="rounded-2xl bg-surface-50 p-4 dark:bg-surface-950">
                <p className="text-sm text-surface-500 dark:text-surface-400">上传中</p>
                <p className="mt-2 text-2xl font-semibold">{counts.uploading || 0}</p>
              </div>
              <div className="rounded-2xl bg-surface-50 p-4 dark:bg-surface-950">
                <p className="text-sm text-surface-500 dark:text-surface-400">失败</p>
                <p className="mt-2 text-2xl font-semibold">{counts.failed || 0}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-[26px] border border-surface-200 bg-white p-5 shadow-sm dark:border-surface-800 dark:bg-surface-900">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="grid flex-1 gap-3 md:grid-cols-2 xl:grid-cols-[minmax(280px,1.2fr)_repeat(3,minmax(0,180px))]">
              <Input
                placeholder="搜索素材"
                value={searchValue}
                onChange={(event) => setSearchValue(event.target.value)}
                leftIcon={Search}
              />
              <select
                value={mediaType}
                onChange={(event) => setMediaType(event.target.value)}
                className="rounded-xl border border-surface-300 bg-white px-3 py-2 text-sm dark:border-surface-700 dark:bg-surface-900 dark:text-surface-100"
              >
                <option value="all">全部类型</option>
                <option value="video">视频</option>
                <option value="audio">音频</option>
                <option value="image">图片</option>
              </select>
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="rounded-xl border border-surface-300 bg-white px-3 py-2 text-sm dark:border-surface-700 dark:bg-surface-900 dark:text-surface-100"
              >
                <option value="all">全部状态</option>
                <option value="processing">处理中</option>
                <option value="ready">可审阅</option>
                <option value="failed">失败</option>
                <option value="uploading">上传中</option>
              </select>
              <select
                value={sortValue}
                onChange={(event) => setSortValue(event.target.value)}
                className="rounded-xl border border-surface-300 bg-white px-3 py-2 text-sm dark:border-surface-700 dark:bg-surface-900 dark:text-surface-100"
              >
                <option value="updated_at-desc">最近更新</option>
                <option value="updated_at-asc">最早更新</option>
                <option value="created_at-desc">最近创建</option>
                <option value="name-asc">名称 A-Z</option>
                <option value="size_bytes-desc">体积从大到小</option>
              </select>
            </div>

            <div className="inline-flex rounded-xl border border-surface-200 p-1 dark:border-surface-800">
              <button
                type="button"
                className={clsx(
                  'rounded-lg p-2 transition-colors',
                  viewMode === 'grid'
                    ? 'bg-surface-900 text-white dark:bg-surface-100 dark:text-surface-900'
                    : 'text-surface-500 hover:bg-surface-100 dark:hover:bg-surface-800'
                )}
                onClick={() => setViewMode('grid')}
                aria-label="网格视图"
              >
                <Grid3X3 size={16} />
              </button>
              <button
                type="button"
                className={clsx(
                  'rounded-lg p-2 transition-colors',
                  viewMode === 'list'
                    ? 'bg-surface-900 text-white dark:bg-surface-100 dark:text-surface-900'
                    : 'text-surface-500 hover:bg-surface-100 dark:hover:bg-surface-800'
                )}
                onClick={() => setViewMode('list')}
                aria-label="列表视图"
              >
                <List size={16} />
              </button>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {statusChips.map((chip) => (
              <button
                key={chip.key}
                type="button"
                onClick={() => setStatusFilter(chip.key)}
                className={clsx(
                  'inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm transition-colors',
                  statusFilter === chip.key
                    ? 'bg-surface-900 text-white dark:bg-surface-100 dark:text-surface-900'
                    : 'bg-surface-100 text-surface-600 hover:bg-surface-200 dark:bg-surface-800 dark:text-surface-300 dark:hover:bg-surface-700'
                )}
              >
                <span>{chip.label}</span>
                <span className="text-xs opacity-80">{chip.count}</span>
              </button>
            ))}
          </div>

          {hasActiveFilters ? (
            <div className="mt-4 flex flex-wrap items-center gap-3 rounded-2xl border border-surface-200 bg-surface-50 px-4 py-3 text-sm text-surface-700 dark:border-surface-800 dark:bg-surface-950 dark:text-surface-200">
              <span>已应用筛选</span>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  setSelectedFolderId(null);
                  setMediaType('all');
                  setStatusFilter('all');
                  setSortValue('updated_at-desc');
                  setSearchValue('');
                }}
              >
                清空
              </Button>
            </div>
          ) : null}

          {counts.failed ? (
            <div className="mt-4 flex flex-wrap items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900/40 dark:bg-amber-900/10 dark:text-amber-200">
              <AlertTriangle size={16} />
              <span>{counts.failed} 个素材处理失败</span>
            </div>
          ) : null}

          {hasProcessingAssets ? (
            <div className="mt-4 flex flex-wrap items-center gap-3 rounded-2xl border border-surface-200 bg-surface-50 px-4 py-3 text-sm text-surface-700 dark:border-surface-800 dark:bg-surface-950 dark:text-surface-200">
              <div className="flex items-center gap-2">
                <Spinner size="sm" />
                <span>处理中素材会自动刷新</span>
              </div>
              <Button size="sm" variant="secondary" onClick={() => assetsQuery.refetch()}>
                立即刷新
              </Button>
            </div>
          ) : null}

          <div className="mt-5">
            {assetsQuery.isLoading ? (
              <AssetGridSkeleton />
            ) : assetsQuery.isError ? (
              <EmptyState
                icon={Film}
                title="加载失败"
                description="请稍后重试。"
                actionLabel="重新加载"
                onAction={() => assetsQuery.refetch()}
              />
            ) : assets.length === 0 ? (
              <EmptyState
                icon={Film}
                title="没有素材"
                description="上传后会出现在这里。"
                actionLabel="上传素材"
                onAction={() => navigate(`/project/${projectId}/upload`)}
              />
            ) : viewMode === 'grid' ? (
              <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
                {assets.map((asset) => (
                  <AssetCard
                    key={asset.id}
                    asset={asset}
                    onOpen={() => navigate(`/review/${asset.id}`)}
                    onRetry={() => retryProcessingMutation.mutate(asset.id)}
                    onDelete={() => deleteAssetMutation.mutate(asset.id)}
                  />
                ))}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <Head>
                    <Row>
                      <HeaderCell>素材</HeaderCell>
                      <HeaderCell>状态</HeaderCell>
                      <HeaderCell>时长</HeaderCell>
                      <HeaderCell>体积</HeaderCell>
                      <HeaderCell>更新</HeaderCell>
                      <HeaderCell className="w-[180px]">操作</HeaderCell>
                    </Row>
                  </Head>
                  <Body>
                    {assets.map((asset) => (
                      <Row key={asset.id}>
                        <Cell>
                          <button
                            type="button"
                            className="flex items-center gap-3 text-left"
                            onClick={() => navigate(`/review/${asset.id}`)}
                          >
                            <div className="h-12 w-20 overflow-hidden rounded-xl bg-surface-100 dark:bg-surface-950">
                              {asset.thumbnailUrl ? (
                                <img src={asset.thumbnailUrl} alt={asset.name} className="h-full w-full object-cover" />
                              ) : (
                                <div className="flex h-full items-center justify-center text-surface-400">
                                  <Film size={16} />
                                </div>
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="truncate font-medium">{asset.name}</p>
                              <p className="mt-1 text-xs text-surface-500 dark:text-surface-400">{asset.statusDescription}</p>
                            </div>
                          </button>
                        </Cell>
                        <Cell><Badge variant={asset.statusVariant}>{asset.statusLabel}</Badge></Cell>
                        <Cell>{asset.durationLabel}</Cell>
                        <Cell>{asset.sizeLabel}</Cell>
                        <Cell>{asset.updatedLabel}</Cell>
                        <Cell>
                          <div className="flex gap-2">
                            <Button size="sm" variant="secondary" onClick={() => navigate(`/review/${asset.id}`)}>
                              打开
                            </Button>
                            {asset.canRetry ? (
                              <Button size="sm" variant="secondary" onClick={() => retryProcessingMutation.mutate(asset.id)}>
                                重试
                              </Button>
                            ) : null}
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                if (window.confirm(`确定删除“${asset.name}”吗？`)) {
                                  deleteAssetMutation.mutate(asset.id);
                                }
                              }}
                            >
                              删除
                            </Button>
                          </div>
                        </Cell>
                      </Row>
                    ))}
                  </Body>
                </Table>
              </div>
            )}
          </div>
        </div>
      </section>

      <Modal
        open={showCreateFolder}
        onClose={() => {
          setShowCreateFolder(false);
          setNewFolderName('');
        }}
        title="新建文件夹"
        description="用于整理素材。"
      >
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (!newFolderName.trim()) return;
            createFolderMutation.mutate();
          }}
        >
          <Input
            label="名称"
            placeholder="例如：粗剪 / 配音 / 参考"
            value={newFolderName}
            onChange={(event) => setNewFolderName(event.target.value)}
            autoFocus
          />
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setShowCreateFolder(false)}>
              取消
            </Button>
            <Button type="submit" loading={createFolderMutation.isPending}>
              创建
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
