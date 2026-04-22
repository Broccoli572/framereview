import { useCallback, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, CheckCircle2, FolderTree, RefreshCw, UploadCloud } from 'lucide-react';
import clsx from 'clsx';
import client from '../api/client';
import Button from '../components/ui/Button';
import EmptyState from '../components/ui/EmptyState';
import ProgressBar from '../components/ui/ProgressBar';
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

export default function UploadPage() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedFolderId, setSelectedFolderId] = useState('');
  const [items, setItems] = useState([]);

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

      await client.post('/assets/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (event) => {
          const progress = event.total ? Math.round((event.loaded / event.total) * 100) : 0;
          setItems((current) => current.map((entry) => (
            entry.id === item.id ? { ...entry, status: 'uploading', progress } : entry
          )));
        },
      });
    },
    onSuccess: (_, item) => {
      setItems((current) => current.map((entry) => (
        entry.id === item.id ? { ...entry, status: 'success', progress: 100, error: '' } : entry
      )));
      queryClient.invalidateQueries({ queryKey: ['project-assets', projectId] });
    },
    onError: (error, item) => {
      setItems((current) => current.map((entry) => (
        entry.id === item.id
          ? { ...entry, status: 'error', error: error.response?.data?.message || '上传失败，请稍后重试' }
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

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <section className="rounded-[28px] border border-surface-200 bg-white p-6 shadow-sm dark:border-surface-800 dark:bg-surface-900 lg:p-8">
        <p className="text-sm font-medium text-surface-500 dark:text-surface-400">上传</p>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight">{projectQuery.data?.name || '上传素材'}</h2>
        <p className="mt-3 text-sm text-surface-500 dark:text-surface-400">
          上传完成后，后台仍会继续处理。
        </p>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl bg-surface-50 p-4 dark:bg-surface-950">
            <p className="text-sm text-surface-500 dark:text-surface-400">文件</p>
            <p className="mt-2 text-2xl font-semibold">{items.length}</p>
          </div>
          <div className="rounded-2xl bg-surface-50 p-4 dark:bg-surface-950">
            <p className="text-sm text-surface-500 dark:text-surface-400">上传中</p>
            <p className="mt-2 text-2xl font-semibold">{uploadingCount}</p>
          </div>
          <div className="rounded-2xl bg-surface-50 p-4 dark:bg-surface-950">
            <p className="text-sm text-surface-500 dark:text-surface-400">总大小</p>
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
            或点击选择。
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
              目录
            </div>
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

      {items.length === 0 ? (
        <EmptyState
          icon={UploadCloud}
          title="还没有文件"
          description="添加后会出现在这里。"
        />
      ) : (
        <section className="space-y-4">
          <div className="flex flex-col gap-4 rounded-[26px] border border-surface-200 bg-white p-5 shadow-sm dark:border-surface-800 dark:bg-surface-900 md:flex-row md:items-center md:justify-between">
            <div>
              <h3 className="text-lg font-semibold">队列</h3>
              <p className="mt-1 text-sm text-surface-500 dark:text-surface-400">{items.length}</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button variant="ghost" onClick={() => setItems([])} disabled={uploadingCount > 0}>
                清空
              </Button>
              {allUploaded ? (
                <Button onClick={() => navigate(`/project/${projectId}`)}>返回项目</Button>
              ) : (
                <Button onClick={uploadPendingFiles} loading={uploadingCount > 0}>
                  开始上传
                </Button>
              )}
            </div>
          </div>

          {allUploaded ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-900/10 dark:text-emerald-200">
              上传完成，后台仍在处理。
            </div>
          ) : null}

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
