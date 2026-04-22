import { useCallback, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, CheckCircle2, FolderTree, RefreshCw, UploadCloud } from 'lucide-react';
import clsx from 'clsx';
import client from '../api/client';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import EmptyState from '../components/ui/EmptyState';
import ProgressBar from '../components/ui/ProgressBar';
import { normalizeAsset } from '../lib/view-models';
import { formatBytes } from '../lib/utils';

const uploadStatusCopy = {
  pending: '待上传',
  uploading: '上传中',
  success: '已上传',
  error: '失败',
};

function UploadListItem({ item, onRemove, onRetry }) {
  const isUploading = item.status === 'uploading';
  const isError = item.status === 'error';
  const isSuccess = item.status === 'success';

  return (
    <div className="rounded-[22px] border border-surface-200 bg-white p-4 dark:border-surface-800 dark:bg-surface-900">
      <div className="flex items-start gap-4">
        <div
          className={clsx(
            'flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl',
            isSuccess
              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
              : isError
                ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                : 'bg-surface-100 text-surface-500 dark:bg-surface-950 dark:text-surface-400'
          )}
        >
          {isSuccess ? <CheckCircle2 size={20} /> : isError ? <AlertCircle size={20} /> : <UploadCloud size={20} />}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{item.file.name}</p>
              <p className="mt-1 text-xs text-surface-500 dark:text-surface-400">{formatBytes(item.file.size)}</p>
            </div>
            <span className="text-xs font-medium text-surface-500 dark:text-surface-400">{uploadStatusCopy[item.status]}</span>
          </div>

          {isUploading ? (
            <div className="mt-3">
              <ProgressBar value={item.progress} size="sm" showLabel />
            </div>
          ) : null}

          {item.error ? <p className="mt-3 text-xs text-red-600 dark:text-red-400">{item.error}</p> : null}

          <div className="mt-4 flex flex-wrap gap-2">
            {isError ? (
              <Button size="sm" variant="secondary" leftIcon={RefreshCw} onClick={() => onRetry(item.id)}>
                重试
              </Button>
            ) : null}
            {!isUploading ? (
              <Button size="sm" variant="ghost" onClick={() => onRemove(item.id)}>
                移除
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

function UploadedAssetItem({ asset, onOpenReview, onOpenProject }) {
  return (
    <div className="flex flex-col gap-4 rounded-[22px] border border-surface-200 bg-white p-4 dark:border-surface-800 dark:bg-surface-900 md:flex-row md:items-center md:justify-between">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate text-sm font-semibold">{asset.name}</p>
          <Badge variant={asset.statusVariant}>{asset.statusLabel}</Badge>
        </div>
        <p className="mt-2 text-sm text-surface-500 dark:text-surface-400">
          {asset.sizeLabel}
          {asset.folderName ? ` · ${asset.folderName}` : ' · 项目根目录'}
          {asset.statusDescription ? ` · ${asset.statusDescription}` : ''}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" size="sm" onClick={() => onOpenProject(asset)}>
          查看项目列表
        </Button>
        <Button size="sm" onClick={() => onOpenReview(asset)}>
          打开素材
        </Button>
      </div>
    </div>
  );
}

export default function UploadPage() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedFolderId, setSelectedFolderId] = useState('');
  const [items, setItems] = useState([]);
  const [uploadedAssets, setUploadedAssets] = useState([]);

  const projectQuery = useQuery({
    queryKey: ['project', projectId],
    queryFn: async () => {
      const response = await client.get(`/projects/${projectId}`);
      return response.data?.data || response.data || null;
    },
    enabled: Boolean(projectId),
  });

  const foldersQuery = useQuery({
    queryKey: ['project-folders', projectId],
    queryFn: async () => {
      const response = await client.get(`/projects/${projectId}/folders/tree`);
      return response.data?.data || response.data || [];
    },
    enabled: Boolean(projectId),
  });

  const uploadMutation = useMutation({
    mutationFn: async (item) => {
      const formData = new FormData();
      formData.append('file', item.file);
      formData.append('project_id', projectId);
      if (selectedFolderId) {
        formData.append('folder_id', selectedFolderId);
      }

      const response = await client.post('/assets/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (event) => {
          const progress = event.total ? Math.round((event.loaded / event.total) * 100) : 0;
          setItems((current) => current.map((entry) => (
            entry.id === item.id ? { ...entry, status: 'uploading', progress } : entry
          )));
        },
      });

      return response.data;
    },
    onSuccess: (payload, item) => {
      setItems((current) => current.map((entry) => (
        entry.id === item.id ? { ...entry, status: 'success', progress: 100, error: '' } : entry
      )));

      if (payload?.asset) {
        const normalizedAsset = normalizeAsset(payload.asset);
        setUploadedAssets((current) => {
          const deduped = current.filter((asset) => asset.id !== normalizedAsset.id);
          return [normalizedAsset, ...deduped];
        });
      }

      queryClient.invalidateQueries({ queryKey: ['project-assets', projectId] });
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
    },
    onError: (error, item) => {
      setItems((current) => current.map((entry) => (
        entry.id === item.id
          ? { ...entry, status: 'error', error: error.response?.data?.message || '上传失败，请稍后重试。' }
          : entry
      )));
    },
  });

  const addFiles = useCallback((incomingFiles) => {
    const nextItems = incomingFiles.map((file) => ({
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      file,
      status: 'pending',
      progress: 0,
      error: '',
    }));

    setItems((current) => [...current, ...nextItems]);
  }, []);

  const handleDrop = useCallback((event) => {
    event.preventDefault();
    addFiles(Array.from(event.dataTransfer.files || []));
  }, [addFiles]);

  const handleSelectFiles = (event) => {
    addFiles(Array.from(event.target.files || []));
  };

  const uploadPendingFiles = useCallback(() => {
    items
      .filter((item) => item.status === 'pending' || item.status === 'error')
      .forEach((item) => {
        uploadMutation.mutate(item);
      });
  }, [items, uploadMutation]);

  const allUploaded = useMemo(
    () => items.length > 0 && items.every((item) => item.status === 'success'),
    [items]
  );

  const totalSize = items.reduce((sum, item) => sum + item.file.size, 0);
  const uploadingCount = items.filter((item) => item.status === 'uploading').length;
  const latestUploadedAsset = uploadedAssets[0] || null;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <section className="rounded-[28px] border border-surface-200 bg-white p-6 shadow-sm dark:border-surface-800 dark:bg-surface-900 lg:p-8">
        <p className="text-sm font-medium text-surface-500 dark:text-surface-400">上传</p>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight">{projectQuery.data?.name || '上传素材'}</h2>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-surface-500 dark:text-surface-400">
          上传完成后，素材会立即写入当前项目列表。你可以留在这里继续传，也可以随时跳回项目查看刚刚落进去的视频。
        </p>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl bg-surface-50 p-4 dark:bg-surface-950">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-surface-400">文件数</p>
            <p className="mt-2 text-2xl font-semibold">{items.length}</p>
          </div>
          <div className="rounded-2xl bg-surface-50 p-4 dark:bg-surface-950">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-surface-400">上传中</p>
            <p className="mt-2 text-2xl font-semibold">{uploadingCount}</p>
          </div>
          <div className="rounded-2xl bg-surface-50 p-4 dark:bg-surface-950">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-surface-400">总大小</p>
            <p className="mt-2 text-2xl font-semibold">{formatBytes(totalSize)}</p>
          </div>
        </div>

        <div
          className={clsx(
            'mt-6 rounded-[28px] border-2 border-dashed px-6 py-10 text-center transition-colors',
            uploadingCount
              ? 'border-surface-300 bg-surface-50 dark:border-surface-700 dark:bg-surface-950'
              : 'border-surface-300 bg-surface-50 hover:border-brand-400 hover:bg-brand-50/40 dark:border-surface-700 dark:bg-surface-950 dark:hover:border-brand-600'
          )}
          onDragOver={(event) => event.preventDefault()}
          onDrop={handleDrop}
        >
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-surface-900 text-white dark:bg-surface-100 dark:text-surface-900">
            <UploadCloud size={24} />
          </div>
          <h3 className="mt-4 text-lg font-semibold">拖拽文件到这里</h3>
          <p className="mt-2 text-sm text-surface-500 dark:text-surface-400">
            支持一次加入多个视频，上传后会在下方显示已成功落库的素材。
          </p>
          <div className="mt-6">
            <label className="inline-flex cursor-pointer items-center justify-center rounded-xl bg-surface-900 px-4 py-2.5 text-sm font-medium text-white dark:bg-surface-100 dark:text-surface-900">
              选择文件
              <input type="file" className="hidden" multiple onChange={handleSelectFiles} />
            </label>
          </div>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_240px]">
          <div className="rounded-2xl bg-surface-50 p-4 dark:bg-surface-950">
            <div className="flex items-center gap-2 text-sm font-medium">
              <FolderTree size={16} />
              目标目录
            </div>
            <p className="mt-2 text-sm text-surface-500 dark:text-surface-400">
              不选时默认进入项目根目录，后续也可以在项目里再移动或新建文件夹整理。
            </p>
          </div>

          <select
            value={selectedFolderId}
            onChange={(event) => setSelectedFolderId(event.target.value)}
            className="rounded-2xl border border-surface-300 bg-white px-4 py-3 text-sm dark:border-surface-700 dark:bg-surface-900 dark:text-surface-100"
          >
            <option value="">项目根目录</option>
            {(foldersQuery.data || []).map((folder) => (
              <option key={folder.id} value={folder.id}>
                {folder.name}
              </option>
            ))}
          </select>
        </div>
      </section>

      {uploadedAssets.length > 0 ? (
        <section className="space-y-4 rounded-[26px] border border-emerald-200 bg-emerald-50/70 p-5 shadow-sm dark:border-emerald-900/40 dark:bg-emerald-900/10">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h3 className="text-lg font-semibold text-emerald-900 dark:text-emerald-200">已成功上传的素材</h3>
              <p className="mt-1 text-sm text-emerald-700 dark:text-emerald-300">
                素材已经写入当前项目。现在就能回项目列表查看，不用担心“上传成功但找不到”。
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" onClick={() => navigate(`/project/${projectId}`)}>
                查看项目列表
              </Button>
              {latestUploadedAsset ? (
                <Button onClick={() => navigate(`/review/${latestUploadedAsset.id}`)}>
                  打开最新素材
                </Button>
              ) : null}
            </div>
          </div>

          <div className="space-y-3">
            {uploadedAssets.map((asset) => (
              <UploadedAssetItem
                key={asset.id}
                asset={asset}
                onOpenProject={() => navigate(`/project/${projectId}`)}
                onOpenReview={() => navigate(`/review/${asset.id}`)}
              />
            ))}
          </div>
        </section>
      ) : null}

      {items.length === 0 ? (
        <EmptyState
          icon={UploadCloud}
          title="还没有加入文件"
          description="把视频先拖进来，上传成功后下方会直接出现已入库素材。"
        />
      ) : (
        <section className="space-y-4">
          <div className="flex flex-col gap-4 rounded-[26px] border border-surface-200 bg-white p-5 shadow-sm dark:border-surface-800 dark:bg-surface-900 md:flex-row md:items-center md:justify-between">
            <div>
              <h3 className="text-lg font-semibold">上传队列</h3>
              <p className="mt-1 text-sm text-surface-500 dark:text-surface-400">
                {items.length} 个文件
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button variant="ghost" onClick={() => setItems([])} disabled={uploadingCount > 0}>
                清空
              </Button>
              {allUploaded ? (
                <Button onClick={() => navigate(`/project/${projectId}`)}>查看项目列表</Button>
              ) : (
                <Button onClick={uploadPendingFiles} loading={uploadingCount > 0}>
                  开始上传
                </Button>
              )}
            </div>
          </div>

          <div className="space-y-3">
            {items.map((item) => (
              <UploadListItem
                key={item.id}
                item={item}
                onRemove={(id) => setItems((current) => current.filter((entry) => entry.id !== id))}
                onRetry={(id) => {
                  const target = items.find((entry) => entry.id === id);
                  if (!target) return;
                  setItems((current) => current.map((entry) => (
                    entry.id === id ? { ...entry, status: 'pending', progress: 0, error: '' } : entry
                  )));
                  uploadMutation.mutate({ ...target, status: 'pending', progress: 0, error: '' });
                }}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
