import { useMemo, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Grid,
  List,
  Upload,
  Film,
  ChevronRight,
  ChevronDown,
  FolderPlus,
  Trash2,
  Play,
} from 'lucide-react';
import clsx from 'clsx';
import client from '../api/client';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Spinner from '../components/ui/Spinner';
import EmptyState from '../components/ui/EmptyState';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import Input from '../components/ui/Input';
import Table, { Head, Body, Row, HeaderCell, Cell } from '../components/ui/Table';
import { formatBytes, formatDuration, formatRelativeTime } from '../lib/utils';

function FolderTreeNode({ folder, selectedId, onSelect, depth }) {
  const [expanded, setExpanded] = useState(depth < 1);
  const hasChildren = folder.children?.length > 0;

  return (
    <div>
      <div
        className={clsx(
          'flex cursor-pointer items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm transition-colors',
          selectedId === folder.id
            ? 'bg-brand-50 text-brand-700 dark:bg-brand-900/20 dark:text-brand-300'
            : 'text-surface-600 hover:bg-surface-100 dark:text-surface-400 dark:hover:bg-surface-800'
        )}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
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
          <span className="w-3.5" />
        )}
        <FolderPlus size={14} className="text-surface-400" />
        <span className="truncate">{folder.name}</span>
        {folder.assets_count !== undefined && (
          <span className="ml-auto text-xs text-surface-400">{folder.assets_count}</span>
        )}
      </div>

      {hasChildren && expanded && (
        <FolderTree
          folders={folder.children}
          selectedId={selectedId}
          onSelect={onSelect}
          depth={depth + 1}
        />
      )}
    </div>
  );
}

function FolderTree({ folders, selectedId, onSelect, depth = 0 }) {
  return (
    <div className={clsx(depth > 0 && 'ml-4 border-l border-surface-200 dark:border-surface-800')}>
      {folders.map((folder) => (
        <FolderTreeNode
          key={folder.id}
          folder={folder}
          selectedId={selectedId}
          onSelect={onSelect}
          depth={depth}
        />
      ))}
    </div>
  );
}

export default function ProjectPage() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [viewMode, setViewMode] = useState('grid');
  const [sortBy, setSortBy] = useState('updated_at');
  const [sortDir, setSortDir] = useState('desc');
  const [filterType, setFilterType] = useState('all');
  const [selectedFolder, setSelectedFolder] = useState(null);
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  const { data: project, isLoading: projLoading } = useQuery({
    queryKey: ['project', projectId],
    queryFn: async () => {
      const res = await client.get(`/projects/${projectId}`);
      return res.data?.data || res.data;
    },
    enabled: !!projectId,
  });

  const { data: folders, isLoading: foldersLoading } = useQuery({
    queryKey: ['project-folders', projectId],
    queryFn: async () => {
      const res = await client.get(`/projects/${projectId}/folders`);
      return res.data?.data || res.data || [];
    },
    enabled: !!projectId,
  });

  const {
    data: assets,
    isLoading: assetsLoading,
    error: assetsError,
  } = useQuery({
    queryKey: ['project-assets', projectId, selectedFolder, filterType, sortBy, sortDir],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedFolder) params.set('folder_id', selectedFolder);
      if (filterType !== 'all') params.set('type', filterType);
      params.set('sort', sortBy === 'size' ? 'size_bytes' : sortBy);
      params.set('order', sortDir);

      const res = await client.get(`/projects/${projectId}/assets?${params}`);
      const responseData = res.data?.data || res.data;
      return Array.isArray(responseData) ? responseData : (responseData?.data || []);
    },
    enabled: !!projectId,
  });

  const createFolderMutation = useMutation({
    mutationFn: (name) => client.post(`/projects/${projectId}/folders`, { name, parent_id: selectedFolder }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-folders', projectId] });
      setShowCreateFolder(false);
      setNewFolderName('');
    },
  });

  const deleteAssetMutation = useMutation({
    mutationFn: (assetId) => client.delete(`/assets/${assetId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-assets', projectId] });
    },
  });

  const sortConfig = useMemo(() => ({
    updated_at: { field: 'updatedAt' },
    created_at: { field: 'createdAt' },
    name: { field: 'name' },
    size: { field: 'sizeBytes' },
  }), []);

  const sortedAssets = useMemo(() => {
    if (!assets) return [];

    const cfg = sortConfig[sortBy] || { field: sortBy };
    return [...assets].sort((a, b) => {
      let va = a[cfg.field] || '';
      let vb = b[cfg.field] || '';

      if (typeof va === 'string') va = va.toLowerCase();
      if (typeof vb === 'string') vb = vb.toLowerCase();

      if (sortDir === 'asc') {
        return va > vb ? 1 : -1;
      }

      return va < vb ? 1 : -1;
    });
  }, [assets, sortBy, sortDir, sortConfig]);

  const filteredAssets = useMemo(() => {
    if (filterType === 'all') return sortedAssets;

    return sortedAssets.filter((asset) => {
      const type = asset.type || asset.mimeType || '';
      if (filterType === 'video') {
        return (
          type.startsWith('video/') ||
          ['mp4', 'mov', 'avi', 'mkv'].some((ext) => (asset.name || '').toLowerCase().endsWith(ext))
        );
      }
      if (filterType === 'image') return type.startsWith('image/');
      if (filterType === 'audio') return type.startsWith('audio/');
      return true;
    });
  }, [sortedAssets, filterType]);

  const isLoading = projLoading || assetsLoading;
  const formatStatusLabel = (status) => {
    if (status === 'ready') return '就绪';
    if (status === 'processing') return '处理中';
    if (status === 'failed') return '处理失败';
    if (status === 'deleted') return '已删除';
    return status || '-';
  };

  return (
    <div className="flex h-full">
      <div className="w-60 flex-shrink-0 overflow-y-auto border-r border-surface-200 bg-white dark:border-surface-800 dark:bg-surface-900">
        <div className="p-3">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-surface-700 dark:text-surface-300">文件夹</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowCreateFolder(true)}
              leftIcon={FolderPlus}
              className="h-7 w-7 p-0"
            >
              <FolderPlus size={14} />
            </Button>
          </div>

          <div
            className={clsx(
              'flex cursor-pointer items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm transition-colors',
              !selectedFolder
                ? 'bg-brand-50 text-brand-700 dark:bg-brand-900/20 dark:text-brand-300'
                : 'text-surface-600 hover:bg-surface-100 dark:text-surface-400 dark:hover:bg-surface-800'
            )}
            onClick={() => setSelectedFolder(null)}
          >
            <FolderPlus size={14} />
            <span>全部文件</span>
          </div>

          {foldersLoading ? (
            <div className="flex justify-center py-4">
              <Spinner size="sm" />
            </div>
          ) : (
            <FolderTree
              folders={folders || []}
              selectedId={selectedFolder}
              onSelect={setSelectedFolder}
            />
          )}
        </div>
      </div>

      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="flex items-center gap-3 border-b border-surface-200 bg-white px-4 py-3 dark:border-surface-800 dark:bg-surface-900">
          <div className="flex items-center gap-1 text-sm text-surface-500 dark:text-surface-400">
            <Link to="/" className="hover:text-brand-600 dark:hover:text-brand-400">工作台</Link>
            <ChevronRight size={14} />
            <span className="max-w-[200px] truncate font-medium text-surface-900 dark:text-surface-100">
              {project?.name || '项目'}
            </span>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="h-8 rounded-lg border border-surface-300 bg-white px-2 text-xs dark:border-surface-700 dark:bg-surface-800 dark:text-surface-300"
            >
              <option value="all">全部类型</option>
              <option value="video">视频</option>
              <option value="image">图片</option>
              <option value="audio">音频</option>
            </select>

            <select
              value={`${sortBy}-${sortDir}`}
              onChange={(e) => {
                const [by, dir] = e.target.value.split('-');
                setSortBy(by);
                setSortDir(dir);
              }}
              className="h-8 rounded-lg border border-surface-300 bg-white px-2 text-xs dark:border-surface-700 dark:bg-surface-800 dark:text-surface-300"
            >
              <option value="updated_at-desc">最近更新</option>
              <option value="updated_at-asc">最早更新</option>
              <option value="name-asc">名称 A-Z</option>
              <option value="name-desc">名称 Z-A</option>
              <option value="size-desc">大小（大→小）</option>
              <option value="size-asc">大小（小→大）</option>
            </select>

            <div className="flex rounded-lg border border-surface-200 dark:border-surface-700">
              <button
                onClick={() => setViewMode('grid')}
                className={clsx(
                  'rounded-l-lg p-1.5 transition-colors',
                  viewMode === 'grid'
                    ? 'bg-surface-100 text-surface-700 dark:bg-surface-800 dark:text-surface-200'
                    : 'text-surface-400 hover:text-surface-600'
                )}
              >
                <Grid size={14} />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={clsx(
                  'rounded-r-lg p-1.5 transition-colors',
                  viewMode === 'list'
                    ? 'bg-surface-100 text-surface-700 dark:bg-surface-800 dark:text-surface-200'
                    : 'text-surface-400 hover:text-surface-600'
                )}
              >
                <List size={14} />
              </button>
            </div>

            <Button
              size="sm"
              leftIcon={Upload}
              onClick={() => navigate(`/project/${projectId}/upload`)}
            >
              上传
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <div className="flex h-full items-center justify-center">
              <Spinner size="lg" text="加载资源..." />
            </div>
          ) : assetsError ? (
            <EmptyState
              icon={Film}
              title="资源加载失败"
              description="请稍后再试。"
            />
          ) : filteredAssets.length === 0 ? (
            <EmptyState
              icon={Film}
              title="还没有资源"
              description="上传文件到这个项目中"
              action={(
                <Button leftIcon={Upload} onClick={() => navigate(`/project/${projectId}/upload`)}>
                  上传文件
                </Button>
              )}
            />
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
              {filteredAssets.map((asset) => (
                <div key={asset.id} className="group relative">
                  <Card
                    hover
                    className="overflow-hidden p-0"
                    onClick={() => navigate(`/review/${asset.id}`)}
                  >
                    <div className="relative aspect-video bg-surface-100 dark:bg-surface-800">
                      {asset.thumbnailUrl ? (
                        <img
                          src={asset.thumbnailUrl}
                          alt={asset.name}
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center">
                          <Film size={24} className="text-surface-400" />
                        </div>
                      )}

                      <div className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-all group-hover:bg-black/30 group-hover:opacity-100">
                        <Play size={28} className="text-white" />
                      </div>

                      {asset.duration && (
                        <span className="absolute bottom-1.5 right-1.5 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-mono text-white">
                          {formatDuration(asset.duration)}
                        </span>
                      )}
                    </div>

                    <div className="px-2.5 py-2">
                      <p className="truncate text-sm font-medium text-surface-900 dark:text-surface-100">
                        {asset.name}
                      </p>
                      <div className="mt-1 flex items-center gap-2 text-xs text-surface-500">
                        {asset.sizeBytes && <span>{formatBytes(asset.sizeBytes)}</span>}
                        {asset.status && (
                          <Badge
                            variant={asset.status === 'ready' ? 'success' : asset.status === 'processing' ? 'warning' : 'default'}
                            dot
                          >
                            {formatStatusLabel(asset.status)}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </Card>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (window.confirm('确定删除此资源？')) {
                        deleteAssetMutation.mutate(asset.id);
                      }
                    }}
                    className="absolute right-1.5 top-1.5 rounded-md bg-black/50 p-1 text-white opacity-0 transition-opacity hover:bg-red-600 group-hover:opacity-100"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <Table>
              <Head>
                <Row>
                  <HeaderCell>名称</HeaderCell>
                  <HeaderCell>大小</HeaderCell>
                  <HeaderCell>时长</HeaderCell>
                  <HeaderCell>状态</HeaderCell>
                  <HeaderCell>更新时间</HeaderCell>
                  <HeaderCell className="w-16" />
                </Row>
              </Head>
              <Body>
                {filteredAssets.map((asset) => (
                  <Row
                    key={asset.id}
                    className="cursor-pointer"
                    onClick={() => navigate(`/review/${asset.id}`)}
                  >
                    <Cell>
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-16 flex-shrink-0 overflow-hidden rounded bg-surface-100 dark:bg-surface-800">
                          {asset.thumbnailUrl ? (
                            <img src={asset.thumbnailUrl} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <div className="flex h-full items-center justify-center">
                              <Film size={14} className="text-surface-400" />
                            </div>
                          )}
                        </div>
                        <span className="truncate font-medium">{asset.name}</span>
                      </div>
                    </Cell>
                    <Cell>{asset.sizeBytes ? formatBytes(asset.sizeBytes) : '-'}</Cell>
                    <Cell>{asset.duration ? formatDuration(asset.duration) : '-'}</Cell>
                    <Cell>
                      <Badge
                        variant={asset.status === 'ready' ? 'success' : asset.status === 'processing' ? 'warning' : 'default'}
                        dot
                      >
                        {formatStatusLabel(asset.status)}
                      </Badge>
                    </Cell>
                    <Cell>
                      <span className="text-xs">{formatRelativeTime(asset.updatedAt)}</span>
                    </Cell>
                    <Cell>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (window.confirm('确定删除此资源？')) {
                            deleteAssetMutation.mutate(asset.id);
                          }
                        }}
                        className="text-surface-400 hover:text-red-500"
                      >
                        <Trash2 size={14} />
                      </button>
                    </Cell>
                  </Row>
                ))}
              </Body>
            </Table>
          )}
        </div>
      </div>

      <Modal
        open={showCreateFolder}
        onClose={() => {
          setShowCreateFolder(false);
          setNewFolderName('');
        }}
        title="新建文件夹"
        size="sm"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!newFolderName.trim()) return;
            createFolderMutation.mutate(newFolderName.trim());
          }}
          className="space-y-4"
        >
          <Input
            placeholder="文件夹名称"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            autoFocus
          />
          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              onClick={() => {
                setShowCreateFolder(false);
                setNewFolderName('');
              }}
            >
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
