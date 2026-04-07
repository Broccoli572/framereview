import { useState, useCallback, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  UploadCloud, X, CheckCircle, AlertCircle, Pause, Play,
  ChevronRight, FolderOpen
} from 'lucide-react';
import client from '../api/client';
import Button from '../components/ui/Button';
import Spinner from '../components/ui/Spinner';
import ProgressBar from '../components/ui/ProgressBar';
import Card from '../components/ui/Card';
import { formatBytes } from '../lib/utils';
import clsx from 'clsx';

function UploadItem({ file, progress, status, error, onCancel, onRetry }) {
  const statusMap = {
    pending: { label: '等待中', variant: 'default', color: 'brand' },
    uploading: { label: '上传中', variant: 'warning', color: 'brand' },
    success: { label: '完成', variant: 'success', color: 'success' },
    error: { label: '失败', variant: 'danger', color: 'danger' },
  };
  const info = statusMap[status] || statusMap.pending;

  return (
    <div className="flex items-center gap-3 rounded-lg bg-surface-50 px-4 py-3 dark:bg-surface-800">
      {/* File icon */}
      <div className={clsx(
        'flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg',
        status === 'success' ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-surface-200 dark:bg-surface-700'
      )}>
        {status === 'success' ? (
          <CheckCircle size={18} className="text-emerald-600 dark:text-emerald-400" />
        ) : status === 'error' ? (
          <AlertCircle size={18} className="text-red-500" />
        ) : (
          <UploadCloud size={18} className="text-surface-400" />
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-surface-900 dark:text-surface-100 truncate">{file.name}</p>
          <span className="text-xs text-surface-500 ml-2 flex-shrink-0">{formatBytes(file.size)}</span>
        </div>
        {status === 'uploading' && (
          <ProgressBar value={progress} size="sm" showLabel className="mt-1.5" />
        )}
        {status === 'error' && error && (
          <p className="mt-1 text-xs text-red-500 truncate">{error}</p>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1">
        {status === 'uploading' && onCancel && (
          <Button variant="ghost" size="sm" onClick={onCancel} className="h-8 w-8 p-0">
            <X size={14} />
          </Button>
        )}
        {status === 'error' && onRetry && (
          <Button variant="ghost" size="sm" onClick={onRetry} className="h-8 text-brand-600">
            重试
          </Button>
        )}
      </div>
    </div>
  );
}

export default function UploadPage() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [files, setFiles] = useState([]);
  const [folderId, setFolderId] = useState(null);

  const { data: project, isLoading: projLoading } = useQuery({
    queryKey: ['project', projectId],
    queryFn: async () => {
      const res = await client.get(`/projects/${projectId}`);
      return res.data?.data || res.data;
    },
    enabled: !!projectId,
  });

  const { data: folders } = useQuery({
    queryKey: ['project-folders', projectId],
    queryFn: async () => {
      const res = await client.get(`/projects/${projectId}/folders`);
      return res.data?.data || res.data || [];
    },
    enabled: !!projectId,
  });

  const uploadMutation = useMutation({
    mutationFn: async (uploadFiles) => {
      const results = [];
      for (const fileItem of uploadFiles) {
        if (fileItem.status === 'success') continue;
        try {
          setFiles((prev) =>
            prev.map((f) => (f.id === fileItem.id ? { ...f, status: 'uploading', progress: 0 } : f))
          );

          const formData = new FormData();
          formData.append('file', fileItem.file);
          formData.append('project_id', projectId);
          if (folderId) formData.append('folder_id', folderId);

          await client.post(`/projects/${projectId}/assets/upload`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
            onUploadProgress: (e) => {
              const pct = e.total ? Math.round((e.loaded / e.total) * 100) : 0;
              setFiles((prev) =>
                prev.map((f) => (f.id === fileItem.id ? { ...f, progress: pct } : f))
              );
            },
          });

          setFiles((prev) =>
            prev.map((f) => (f.id === fileItem.id ? { ...f, status: 'success', progress: 100 } : f))
          );
        } catch (err) {
          setFiles((prev) =>
            prev.map((f) =>
              f.id === fileItem.id
                ? { ...f, status: 'error', error: err.response?.data?.message || '上传失败' }
                : f
            )
          );
        }
      }
      return results;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-assets', projectId] });
    },
  });

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    const droppedFiles = Array.from(e.dataTransfer.files);
    addFiles(droppedFiles);
  }, []);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
  }, []);

  const handleFileSelect = (e) => {
    const selected = Array.from(e.target.files);
    addFiles(selected);
  };

  const addFiles = (newFiles) => {
    const items = newFiles.map((f) => ({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      file: f,
      status: 'pending',
      progress: 0,
      error: null,
    }));
    setFiles((prev) => [...prev, ...items]);
  };

  const removeFile = (id) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const startUpload = () => {
    uploadMutation.mutate(files.filter((f) => f.status !== 'success'));
  };

  const retryFailed = () => {
    const failed = files.filter((f) => f.status === 'error');
    setFiles((prev) =>
      prev.map((f) => (f.status === 'error' ? { ...f, status: 'pending', progress: 0, error: null } : f))
    );
  };

  const allDone = files.length > 0 && files.every((f) => f.status === 'success');
  const hasPending = files.some((f) => f.status === 'pending' || f.status === 'error');
  const isUploading = files.some((f) => f.status === 'uploading');

  return (
    <div className="mx-auto max-w-3xl">
      {/* Breadcrumb */}
      <div className="mb-4 flex items-center gap-1.5 text-sm text-surface-500 dark:text-surface-400">
        <Link to="/" className="hover:text-brand-600 dark:hover:text-brand-400">工作台</Link>
        <ChevronRight size={14} />
        <Link to={`/project/${projectId}`} className="hover:text-brand-600 dark:hover:text-brand-400">
          {project?.name || '项目'}
        </Link>
        <ChevronRight size={14} />
        <span className="text-surface-900 dark:text-surface-100">上传</span>
      </div>

      <h1 className="mb-6 text-2xl font-bold text-surface-900 dark:text-surface-100">上传文件</h1>

      {/* Drop zone */}
      {!allDone && (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          className={clsx(
            'mb-6 flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-12 text-center transition-colors cursor-pointer',
            isUploading
              ? 'border-surface-300 bg-surface-50 dark:border-surface-700 dark:bg-surface-900'
              : 'border-surface-300 bg-surface-50 hover:border-brand-400 hover:bg-brand-50/50 dark:border-surface-700 dark:bg-surface-900 dark:hover:border-brand-600'
          )}
          onClick={() => document.getElementById('file-input')?.click()}
        >
          <UploadCloud size={40} className="text-surface-400 mb-3" />
          <p className="text-sm font-medium text-surface-700 dark:text-surface-300">
            拖放文件到此处，或 <span className="text-brand-600 dark:text-brand-400">点击选择</span>
          </p>
          <p className="mt-1 text-xs text-surface-400">支持视频、图片、音频文件</p>
          <input
            id="file-input"
            type="file"
            multiple
            className="hidden"
            onChange={handleFileSelect}
          />
        </div>
      )}

      {/* Folder selection */}
      {files.length > 0 && (
        <div className="mb-4">
          <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1.5">
            上传到文件夹
          </label>
          <select
            value={folderId || ''}
            onChange={(e) => setFolderId(e.target.value || null)}
            className="w-full rounded-lg border border-surface-300 bg-white px-3 py-2 text-sm dark:border-surface-700 dark:bg-surface-900 dark:text-surface-100"
          >
            <option value="">根目录</option>
            {(folders || []).map((f) => (
              <option key={f.id} value={f.id}>{f.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* File list */}
      {files.length > 0 && (
        <div className="space-y-2 mb-6">
          {files.map((fileItem) => (
            <UploadItem
              key={fileItem.id}
              file={fileItem.file}
              progress={fileItem.progress}
              status={fileItem.status}
              error={fileItem.error}
              onCancel={() => removeFile(fileItem.id)}
              onRetry={retryFailed}
            />
          ))}
        </div>
      )}

      {/* Actions */}
      {files.length > 0 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-surface-500">
            {files.length} 个文件 · {formatBytes(files.reduce((sum, f) => sum + f.file.size, 0))}
          </div>
          <div className="flex items-center gap-2">
            {allDone ? (
              <Button onClick={() => navigate(`/project/${projectId}`)}>
                查看资源
              </Button>
            ) : (
              <>
                <Button variant="ghost" onClick={() => setFiles([])} disabled={isUploading}>
                  清空
                </Button>
                <Button
                  onClick={startUpload}
                  loading={isUploading}
                  disabled={!hasPending}
                >
                  {hasPending && files.some((f) => f.status === 'error') ? '重试上传' : '开始上传'}
                </Button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Empty state */}
      {files.length === 0 && !isUploading && (
        <p className="text-center text-sm text-surface-400">
          选择或拖放文件开始上传
        </p>
      )}
    </div>
  );
}
