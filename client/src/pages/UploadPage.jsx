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
import { finalizeUpload, initiateUpload, uploadAsset, uploadChunk } from '../api/assets';
import { normalizeAsset } from '../lib/view-models';
import { formatBytes } from '../lib/utils';

const CHUNK_UPLOAD_THRESHOLD = 20 * 1024 * 1024;
const CHUNK_SIZE = 8 * 1024 * 1024;

const uploadStatusCopy = {
  pending: '待上传',
  uploading: '上传中',
  success: '已上传',
  error: '失败',
};

function getUploadErrorMessage(error) {
  if (error?.code === 'ECONNABORTED') {
    return '上传耗时过长，连接已中断。请重试，系统会使用更稳的上传链路。';
  }

  return error?.response?.data?.message || error?.message || '上传失败，请稍后重试。';
}

function UploadListItem({ item, onRemove, onRetry }) {
  const isUploading = item.status === 'uploading';
  const isError = item.status === 'error';
  const isSuccess = item.status === 'success';

  return (
    <div className="studio-card rounded-2xl p-3.5">
      <div className="flex items-start gap-4">
        <div
          className={clsx(
            'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl',
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
            <span className="text-xs font-semibold text-zinc-500">{uploadStatusCopy[item.status]}</span>
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
    <div className="studio-card flex flex-col gap-4 rounded-2xl p-3.5 md:flex-row md:items-center md:justify-between">
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
  const [queueRunning, setQueueRunning] = useState(false);

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
      const setProgress = (progress) => {
        setItems((current) => current.map((entry) => (
          entry.id === item.id
            ? { ...entry, status: 'uploading', progress: Math.max(1, Math.min(progress, 99)) }
            : entry
        )));
      };

      if (item.file.size < CHUNK_UPLOAD_THRESHOLD) {
        const response = await uploadAsset({
          file: item.file,
          project_id: projectId,
          folder_id: selectedFolderId || null,
          onProgress: setProgress,
        });

        return response.data;
      }

      const initiateResponse = await initiateUpload({
        project_id: projectId,
        folder_id: selectedFolderId || null,
        file_name: item.file.name,
        file_size: item.file.size,
        content_type: item.file.type || 'application/octet-stream',
      });

      const uploadId = initiateResponse.data?.uploadId;
      const uploadUrl = initiateResponse.data?.uploadUrl;
      if (!uploadId || !uploadUrl) {
        throw new Error('无法创建上传任务。');
      }

      let uploadedBytes = 0;
      for (let start = 0; start < item.file.size; start += CHUNK_SIZE) {
        const chunk = item.file.slice(start, Math.min(start + CHUNK_SIZE, item.file.size));
        await uploadChunk(uploadUrl, chunk, (chunkProgress) => {
          const chunkUploaded = Math.round((chunk.size * chunkProgress) / 100);
          setProgress(Math.round(((uploadedBytes + chunkUploaded) / item.file.size) * 100));
        });
        uploadedBytes += chunk.size;
        setProgress(Math.round((uploadedBytes / item.file.size) * 100));
      }

      const finalizeResponse = await finalizeUpload(uploadId, {
        folder_id: selectedFolderId || null,
        name: item.file.name,
        description: '',
        tags: [],
      });

      return finalizeResponse.data;
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
          ? { ...entry, status: 'error', error: getUploadErrorMessage(error) }
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
    event.target.value = '';
  };

  const uploadPendingFiles = useCallback(async () => {
    if (queueRunning) return;

    const queue = items.filter((item) => item.status === 'pending' || item.status === 'error');
    if (!queue.length) return;

    setQueueRunning(true);
    try {
      for (const item of queue) {
        try {
          await uploadMutation.mutateAsync(item);
        } catch {
          // Keep the rest of the queue moving; each item renders its own error.
        }
      }
    } finally {
      setQueueRunning(false);
    }
  }, [items, queueRunning, uploadMutation]);

  const allUploaded = useMemo(
    () => items.length > 0 && items.every((item) => item.status === 'success'),
    [items]
  );

  const totalSize = items.reduce((sum, item) => sum + item.file.size, 0);
  const uploadingCount = items.filter((item) => item.status === 'uploading').length;
  const isUploading = queueRunning || uploadingCount > 0;
  const latestUploadedAsset = uploadedAssets[0] || null;

  return (
    <div className="mx-auto max-w-5xl space-y-3.5">
      <section className="studio-panel rounded-2xl p-4 lg:p-5">
        <p className="studio-label">Upload</p>
        <h2 className="mt-2.5 text-2xl font-semibold tracking-tight">{projectQuery.data?.name || '上传素材'}</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-500">
          上传后自动进入当前项目。
        </p>

        <div className="mt-5 grid gap-2 sm:grid-cols-3">
          <div className="studio-stat rounded-xl p-3">
            <p className="studio-label">文件数</p>
            <p className="mt-2 text-2xl font-semibold">{items.length}</p>
          </div>
          <div className="studio-stat rounded-xl p-3">
            <p className="studio-label">上传中</p>
            <p className="mt-2 text-2xl font-semibold">{uploadingCount}</p>
          </div>
          <div className="studio-stat rounded-xl p-3">
            <p className="studio-label">总大小</p>
            <p className="mt-2 text-2xl font-semibold">{formatBytes(totalSize)}</p>
          </div>
        </div>

        <div
          className={clsx(
            'studio-dropzone mt-5 rounded-2xl px-6 py-8 text-center transition-colors',
            isUploading
              ? 'opacity-80'
              : ''
          )}
          onDragOver={(event) => event.preventDefault()}
          onDrop={handleDrop}
        >
          <div className="studio-brand-mark mx-auto flex h-14 w-14 items-center justify-center rounded-2xl text-white">
            <UploadCloud size={24} />
          </div>
          <h3 className="mt-4 text-lg font-semibold">拖拽文件到这里</h3>
          <p className="mt-2 text-sm text-surface-500 dark:text-surface-400">
            支持多选视频文件。
          </p>
          <div className="mt-6">
            <label className="inline-flex cursor-pointer items-center justify-center rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-violet-950/30 transition hover:bg-violet-500">
              选择文件
              <input type="file" className="hidden" multiple onChange={handleSelectFiles} />
            </label>
          </div>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_240px]">
          <div className="studio-panel-soft rounded-xl p-4">
            <div className="flex items-center gap-2 text-sm font-medium">
              <FolderTree size={16} />
              目标目录
            </div>
            <p className="mt-2 text-sm text-zinc-500">
              不选择则进入根目录。
            </p>
          </div>

          <select
            value={selectedFolderId}
            onChange={(event) => setSelectedFolderId(event.target.value)}
            className="studio-input rounded-xl px-4 py-3 text-sm"
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
        <section className="space-y-4 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-4 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h3 className="text-lg font-semibold text-emerald-900 dark:text-emerald-200">已成功上传的素材</h3>
              <p className="mt-1 text-sm text-emerald-700 dark:text-emerald-300">
                已写入项目，可立即查看。
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
          description="拖入视频或点击选择文件。"
        />
      ) : (
        <section className="space-y-4">
          <div className="studio-panel flex flex-col gap-4 rounded-2xl p-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h3 className="text-lg font-semibold">上传队列</h3>
              <p className="mt-1 text-sm text-surface-500 dark:text-surface-400">
                {items.length} 个文件
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button variant="ghost" onClick={() => setItems([])} disabled={isUploading}>
                清空
              </Button>
              {allUploaded ? (
                <Button onClick={() => navigate(`/project/${projectId}`)}>查看项目列表</Button>
              ) : (
                <Button onClick={uploadPendingFiles} loading={isUploading}>
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
