import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, CheckCircle2, Film, Loader2, Maximize2, RotateCcw, Search, Trash2, UploadCloud, X } from 'lucide-react';
import clsx from 'clsx';
import client from '../api/client';
import {
  deleteAsset,
  emptyAssetTrash,
  finalizeUpload,
  initiateUpload,
  listAssets,
  listDeletedAssets,
  restoreAsset,
  uploadAsset,
  uploadChunk,
} from '../api/assets';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import EmptyState from '../components/ui/EmptyState';
import Input from '../components/ui/Input';
import ProgressBar from '../components/ui/ProgressBar';
import Skeleton from '../components/ui/Skeleton';
import { ensureWorkspaceUploadTarget, findWorkspaceUploadTarget } from '../lib/workspace-upload';
import { normalizeAsset } from '../lib/view-models';
import { formatBytes, formatRelativeTime } from '../lib/utils';

const CHUNK_UPLOAD_THRESHOLD = 20 * 1024 * 1024;
const CHUNK_SIZE = 8 * 1024 * 1024;

function readVideoMetadata(file) {
  return new Promise((resolve) => {
    if (!file?.type?.startsWith('video/')) {
      resolve(null);
      return;
    }

    const video = document.createElement('video');
    const objectUrl = URL.createObjectURL(file);
    const cleanup = () => {
      URL.revokeObjectURL(objectUrl);
      video.removeAttribute('src');
      video.load();
    };

    video.preload = 'metadata';
    video.onloadedmetadata = () => {
      const metadata = {
        width: video.videoWidth || null,
        height: video.videoHeight || null,
        duration: Number.isFinite(video.duration) ? video.duration : null,
        video: {
          width: video.videoWidth || null,
          height: video.videoHeight || null,
        },
      };
      cleanup();
      resolve(metadata);
    };
    video.onerror = () => {
      cleanup();
      resolve(null);
    };
    video.src = objectUrl;
  });
}

function resolveMediaUrl(asset, detail) {
  const currentVersion = detail?.versions?.find((version) => version.id === detail?.currentVersionId)
    || detail?.versions?.[0]
    || null;

  return (
    currentVersion?.fileUrl ||
    currentVersion?.preview?.proxyUrl ||
    currentVersion?.preview?.hlsUrl ||
    detail?.fileUrl ||
    asset?.previewUrl ||
    asset?.raw?.previewUrl ||
    null
  );
}

function getVideoFrameUrl(url) {
  if (!url) return null;
  return url.includes('#') ? url : `${url}#t=0.1`;
}

function captureVideoPoster(url) {
  return new Promise((resolve) => {
    if (!url) {
      resolve({ posterUrl: null, width: null, height: null });
      return;
    }

    const video = document.createElement('video');
    let settled = false;
    let timeoutId = null;

    const cleanup = () => {
      if (timeoutId) clearTimeout(timeoutId);
      video.pause();
      video.removeAttribute('src');
      video.load();
    };

    const finish = (payload) => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(payload || { posterUrl: null, width: null, height: null });
    };

    const capture = () => {
      const width = Number(video.videoWidth || 0);
      const height = Number(video.videoHeight || 0);
      if (!width || !height) {
        finish({ posterUrl: null, width: null, height: null });
        return;
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext('2d');
      if (!context) {
        finish({ posterUrl: null, width, height });
        return;
      }

      context.drawImage(video, 0, 0, width, height);

      try {
        const posterUrl = canvas.toDataURL('image/jpeg', 0.82);
        finish({ posterUrl, width, height });
      } catch {
        finish({ posterUrl: null, width, height });
      }
    };

    video.preload = 'auto';
    video.muted = true;
    video.playsInline = true;
    video.crossOrigin = 'anonymous';
    video.addEventListener('error', () => finish({ posterUrl: null, width: null, height: null }), { once: true });
    video.addEventListener('seeked', capture, { once: true });
    video.addEventListener('loadedmetadata', () => {
      const duration = Number(video.duration || 0);
      const targetTime = duration > 0 ? Math.min(Math.max(duration * 0.12, 0.08), Math.max(duration - 0.02, 0.08)) : 0.08;

      try {
        if (duration > targetTime) {
          video.currentTime = targetTime;
        } else {
          capture();
        }
      } catch {
        capture();
      }
    }, { once: true });

    timeoutId = setTimeout(() => finish({ posterUrl: null, width: null, height: null }), 8000);
    video.src = url;
  });
}

function WorkspaceSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-36 w-full rounded-2xl" />
      <div className="workspace-video-grid">
        {Array.from({ length: 8 }).map((_, index) => (
          <Skeleton key={index} className="h-44 w-full rounded-2xl" />
        ))}
      </div>
    </div>
  );
}

function VideoCard({ asset, aspectRatio, coverUrl, deleting, onAspectRatio, onDelete, onPreview }) {
  const videoCoverUrl = !coverUrl ? getVideoFrameUrl(asset.previewUrl) : null;

  return (
    <article className="studio-card group relative w-full self-start overflow-hidden rounded-2xl">
      <button type="button" className="block w-full text-left" onClick={() => onPreview(asset)}>
        <div className="studio-thumb relative overflow-hidden" style={{ aspectRatio }}>
          {coverUrl ? (
            <img
              src={coverUrl}
              alt={asset.name}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            />
          ) : videoCoverUrl ? (
            <video
              src={videoCoverUrl}
              muted
              playsInline
              preload="metadata"
              className="pointer-events-none h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
              onLoadedMetadata={(event) => {
                const video = event.currentTarget;
                if (video.videoWidth > 0 && video.videoHeight > 0) {
                  onAspectRatio(asset.id, `${video.videoWidth} / ${video.videoHeight}`);
                }
              }}
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <Film size={32} className="studio-muted" />
            </div>
          )}

          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent px-3 pb-3 pt-12 text-white">
            <div className="flex items-center justify-between gap-2">
              <Badge variant={asset.statusVariant}>{asset.statusLabel}</Badge>
              <span className="text-xs font-medium">{asset.durationLabel}</span>
            </div>
          </div>
        </div>

        <div className="space-y-1.5 p-2.5">
          <p className="line-clamp-1 text-[13px] font-semibold">{asset.name}</p>
          <div className="flex items-center justify-between gap-2 text-[11px] studio-muted">
            <span>{asset.sizeLabel}</span>
            <span>{asset.updatedLabel}</span>
          </div>
        </div>
      </button>

      <button
        type="button"
        className="absolute right-3 top-3 z-10 inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-red-600 shadow-sm ring-1 ring-black/5 transition hover:bg-red-50 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-zinc-950/80 dark:text-red-300 dark:ring-white/10 dark:hover:bg-red-950/70"
        aria-label={`删除 ${asset.name}`}
        disabled={deleting}
        onClick={() => onDelete(asset)}
      >
        {deleting ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
      </button>
    </article>
  );
}

function TrashPanel({ assets, coverMap, loading, restoringId, clearing, onRestore, onEmpty, onClose }) {
  return (
    <section className="studio-panel rounded-2xl p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold">回收站</p>
          <p className="mt-1 text-xs studio-muted">删除的视频会先保留在这里，清空后才会彻底移除数据库记录和文件。</p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="ghost" onClick={onClose}>关闭</Button>
          <Button size="sm" variant="danger" loading={clearing} disabled={!assets.length} onClick={onEmpty}>
            清空回收站
          </Button>
        </div>
      </div>

      <div className="mt-3 divide-y divide-surface-100 dark:divide-white/10">
        {loading ? (
          Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="py-3">
              <Skeleton className="h-14 w-full rounded-xl" />
            </div>
          ))
        ) : assets.length === 0 ? (
          <div className="rounded-xl bg-surface-50 p-4 text-sm studio-muted dark:bg-white/[0.04]">
            回收站是空的。
          </div>
        ) : (
          assets.map((asset) => {
            const coverUrl = asset.thumbnailUrl || coverMap[asset.id] || null;
            const videoCoverUrl = !coverUrl ? getVideoFrameUrl(asset.previewUrl) : null;
            const deletedAt = asset.raw?.deletedAt || asset.raw?.deleted_at || asset.updatedAt;

            return (
              <div key={asset.id} className="flex items-center gap-3 py-3">
                <div className="h-12 w-16 shrink-0 overflow-hidden rounded-lg bg-surface-100 dark:bg-white/10">
                  {coverUrl ? (
                    <img src={coverUrl} alt={asset.name} className="h-full w-full object-cover" />
                  ) : videoCoverUrl ? (
                    <video src={videoCoverUrl} muted playsInline preload="metadata" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <Film size={18} className="studio-muted" />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{asset.name}</p>
                  <p className="mt-0.5 text-xs studio-muted">
                    {asset.sizeLabel} · 删除于 {deletedAt ? formatRelativeTime(deletedAt) : '刚刚'}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="secondary"
                  leftIcon={RotateCcw}
                  loading={restoringId === asset.id}
                  onClick={() => onRestore(asset)}
                >
                  恢复
                </Button>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}

function UploadQueue({ items }) {
  const visibleItems = items.filter((item) => item.status !== 'success').slice(0, 3);
  if (!visibleItems.length) return null;

  return (
    <section className="studio-panel rounded-2xl p-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">上传队列</p>
          <p className="mt-0.5 text-xs studio-muted">{visibleItems.length} 个任务进行中</p>
        </div>
      </div>

      <div className="mt-3 space-y-2">
        {visibleItems.map((item) => (
          <div key={item.id} className="studio-panel-soft rounded-xl p-3">
            <div className="flex items-start gap-3">
              <div className="mt-0.5">
                {item.status === 'success' ? (
                  <CheckCircle2 size={16} className="text-emerald-500" />
                ) : item.status === 'error' ? (
                  <AlertCircle size={16} className="text-red-500" />
                ) : (
                  <Loader2 size={16} className="animate-spin text-violet-500" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-3">
                  <p className="truncate text-xs font-semibold">{item.file.name}</p>
                  <span className="text-[11px] studio-muted">{formatBytes(item.file.size)}</span>
                </div>
                {item.status === 'uploading' ? (
                  <ProgressBar value={item.progress} size="sm" className="mt-2" />
                ) : item.error ? (
                  <p className="mt-1 text-xs text-red-500">{item.error}</p>
                ) : (
                  <p className="mt-1 text-xs studio-muted">{item.status === 'success' ? '已写入工作区' : '等待上传'}</p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function getAspectRatioValue(aspectRatio) {
  if (typeof aspectRatio === 'number' && Number.isFinite(aspectRatio)) return aspectRatio;
  if (typeof aspectRatio !== 'string') return 16 / 9;

  const [rawWidth, rawHeight] = aspectRatio.split('/').map((part) => Number(part.trim()));
  if (!rawWidth || !rawHeight) return 16 / 9;
  return rawWidth / rawHeight;
}

function FloatingPreview({ asset, aspectRatio, detail, loading, onAspectRatio, onClose, onOpenReview }) {
  if (!asset) return null;

  const mediaUrl = resolveMediaUrl(asset, detail);
  const ratioValue = getAspectRatioValue(aspectRatio);
  const isPortrait = ratioValue < 0.9;
  const mediaFrameStyle = isPortrait
    ? {
        aspectRatio,
        width: `min(calc(min(68svh, 620px) * ${ratioValue}), 100%)`,
      }
    : { aspectRatio };

  return (
    <div className="pointer-events-none fixed inset-0 z-40 flex items-center justify-center p-3 sm:p-4">
      <div
        className={clsx(
          'pointer-events-auto max-h-[calc(100svh-1.5rem)] w-full overflow-y-auto rounded-2xl border border-surface-200 bg-white p-2.5 text-surface-950 shadow-[0_18px_54px_rgba(15,23,42,0.2)] dark:border-white/10 dark:bg-zinc-950 dark:text-white sm:max-h-[calc(100svh-2rem)] sm:p-3',
          isPortrait
            ? 'sm:w-auto sm:max-w-[min(760px,calc(100vw-2rem))]'
            : 'max-w-[min(1120px,calc(100vw-1.5rem))] sm:max-w-[min(1120px,calc(100vw-2rem))]'
        )}
        onClick={(event) => event.stopPropagation()}
      >
      <div
        className={clsx(
          'grid min-w-0 gap-3',
          isPortrait
            ? 'lg:grid-cols-[minmax(180px,auto)_minmax(220px,280px)] lg:justify-center'
            : 'lg:grid-cols-[minmax(0,1fr)_minmax(220px,280px)]'
        )}
      >
        <div
          className={clsx(
            'overflow-hidden rounded-xl bg-black',
            isPortrait
              ? 'mx-auto min-w-[180px] max-w-full'
              : 'max-h-[58svh] min-h-[180px] w-full sm:max-h-[68svh]'
          )}
          style={mediaFrameStyle}
        >
          {loading ? (
            <div className="flex h-full items-center justify-center">
              <Loader2 className="animate-spin" size={28} />
            </div>
          ) : mediaUrl ? (
            <video
              src={mediaUrl}
              controls
              playsInline
              className="h-full w-full object-contain"
              onLoadedMetadata={(event) => {
                const video = event.currentTarget;
                if (video.videoWidth > 0 && video.videoHeight > 0) {
                  onAspectRatio(asset.id, `${video.videoWidth} / ${video.videoHeight}`);
                }
              }}
            />
          ) : asset.thumbnailUrl ? (
            <img src={asset.thumbnailUrl} alt={asset.name} className="h-full w-full object-contain" />
          ) : (
            <div className="flex h-full items-center justify-center text-zinc-500">
              <Film size={36} />
            </div>
          )}
        </div>

        <aside className="flex min-w-0 flex-col justify-between gap-4 rounded-xl bg-surface-50 p-3 dark:bg-white/[0.06] sm:p-4">
          <div className="min-w-0">
            <div className="flex items-start justify-between gap-3">
              <Badge variant={asset.statusVariant}>{asset.statusLabel}</Badge>
              <button type="button" className="rounded-lg p-1.5 text-surface-400 hover:bg-surface-100 hover:text-surface-900 dark:text-zinc-400 dark:hover:bg-white/10 dark:hover:text-white" onClick={onClose}>
                <X size={16} />
              </button>
            </div>
            <h3 className="mt-3 line-clamp-2 text-base font-semibold">{asset.name}</h3>
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-surface-500 dark:text-zinc-300">
              <div className="rounded-xl bg-white p-2 dark:bg-black/20">
                <p className="text-zinc-500">时长</p>
                <p className="mt-1 font-medium text-surface-950 dark:text-white">{asset.durationLabel}</p>
              </div>
              <div className="rounded-xl bg-white p-2 dark:bg-black/20">
                <p className="text-zinc-500">体积</p>
                <p className="mt-1 font-medium text-surface-950 dark:text-white">{asset.sizeLabel}</p>
              </div>
              <div className="col-span-2 rounded-xl bg-white p-2 dark:bg-black/20">
                <p className="text-zinc-500">更新</p>
                <p className="mt-1 font-medium text-surface-950 dark:text-white">{asset.updatedLabel}</p>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <Button size="sm" variant="secondary" className="flex-1" onClick={() => onOpenReview(asset)}>
              进入审阅
            </Button>
            <Button size="sm" variant="ghost" leftIcon={Maximize2} onClick={() => onOpenReview(asset)}>
              全屏
            </Button>
          </div>
        </aside>
      </div>
      </div>
    </div>
  );
}

export default function WorkspacePage() {
  const { workspaceId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fileInputRef = useRef(null);
  const [activeProjectId, setActiveProjectId] = useState(null);
  const [searchValue, setSearchValue] = useState('');
  const [dropActive, setDropActive] = useState(false);
  const [uploadItems, setUploadItems] = useState([]);
  const [previewAssetId, setPreviewAssetId] = useState(null);
  const [fallbackUploadTarget, setFallbackUploadTarget] = useState(null);
  const [assetAspectRatios, setAssetAspectRatios] = useState({});
  const [assetPosterMap, setAssetPosterMap] = useState({});
  const [showTrash, setShowTrash] = useState(false);

  const workspaceQuery = useQuery({
    queryKey: ['workspace', workspaceId],
    queryFn: async () => {
      const response = await client.get(`/workspaces/${workspaceId}`);
      return response.data?.data || response.data || null;
    },
    enabled: Boolean(workspaceId),
  });

  const projectsQuery = useQuery({
    queryKey: ['workspace-projects', workspaceId],
    queryFn: async () => {
      const response = await client.get(`/workspaces/${workspaceId}/projects`);
      const payload = response.data?.data || response.data || [];
      return Array.isArray(payload) ? payload : payload.data || [];
    },
    enabled: Boolean(workspaceId),
  });

  const projects = projectsQuery.data || [];
  const uploadTarget = useMemo(
    () => projects.find((project) => project.id === activeProjectId) || findWorkspaceUploadTarget(projects) || fallbackUploadTarget || projects[0] || null,
    [activeProjectId, fallbackUploadTarget, projects]
  );

  const assetsQuery = useQuery({
    queryKey: ['workspace-video-assets', uploadTarget?.id],
    queryFn: async () => {
      const response = await listAssets(uploadTarget.id, {
        per_page: 100,
        sort: 'updated_at',
        order: 'desc',
        type: 'video',
      });
      const payload = response.data?.data || response.data || [];
      const items = Array.isArray(payload) ? payload : payload.data || [];
      return items.map(normalizeAsset);
    },
    enabled: Boolean(uploadTarget?.id),
  });

  const trashQuery = useQuery({
    queryKey: ['workspace-video-trash', uploadTarget?.id],
    queryFn: async () => {
      const response = await listDeletedAssets(uploadTarget.id, {
        per_page: 100,
        type: 'video',
      });
      const payload = response.data || {};
      const items = Array.isArray(payload.data) ? payload.data : [];
      return {
        total: Number(payload.total || items.length),
        items: items.map(normalizeAsset),
      };
    },
    enabled: Boolean(uploadTarget?.id),
  });

  const previewAsset = (assetsQuery.data || []).find((asset) => asset.id === previewAssetId) || null;
  const previewQuery = useQuery({
    queryKey: ['workspace-preview-asset', previewAssetId],
    queryFn: async () => {
      const response = await client.get(`/assets/${previewAssetId}`);
      return response.data?.data || response.data || null;
    },
    enabled: Boolean(previewAssetId),
  });

  const uploadMutation = useMutation({
    mutationFn: async (files) => {
      const target = uploadTarget || await ensureWorkspaceUploadTarget(workspaceId, projects);
      if (!target?.id) throw new Error('无法创建上传入口');
      setActiveProjectId(target.id);
      setFallbackUploadTarget(target);

      for (const file of files) {
        const itemId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
        setUploadItems((current) => [
          { id: itemId, file, status: 'uploading', progress: 1, error: '' },
          ...current,
        ]);

        const updateItem = (patch) => {
          setUploadItems((current) => current.map((item) => (
            item.id === itemId ? { ...item, ...patch } : item
          )));
        };

        try {
          const metadata = await readVideoMetadata(file);

          if (file.size < CHUNK_UPLOAD_THRESHOLD) {
            await uploadAsset({
              file,
              project_id: target.id,
              metadata,
              onProgress: (progress) => updateItem({ progress: Math.max(1, Math.min(progress, 99)) }),
            });
          } else {
            const initiateResponse = await initiateUpload({
              project_id: target.id,
              file_name: file.name,
              file_size: file.size,
              content_type: file.type || 'application/octet-stream',
              metadata,
            });
            const uploadId = initiateResponse.data?.uploadId;
            const uploadUrl = initiateResponse.data?.uploadUrl;
            if (!uploadId || !uploadUrl) throw new Error('无法创建上传任务');

            let uploadedBytes = 0;
            for (let start = 0; start < file.size; start += CHUNK_SIZE) {
              const chunk = file.slice(start, Math.min(start + CHUNK_SIZE, file.size));
              await uploadChunk(uploadUrl, chunk, (chunkProgress) => {
                const chunkUploaded = Math.round((chunk.size * chunkProgress) / 100);
                updateItem({ progress: Math.round(((uploadedBytes + chunkUploaded) / file.size) * 100) });
              });
              uploadedBytes += chunk.size;
              updateItem({ progress: Math.round((uploadedBytes / file.size) * 100) });
            }

            await finalizeUpload(uploadId, {
              name: file.name,
              description: '',
              tags: [],
            });
          }

          updateItem({ status: 'success', progress: 100, error: '' });
          queryClient.invalidateQueries({ queryKey: ['workspace-video-assets', target.id] });
        } catch (error) {
          updateItem({
            status: 'error',
            error: error?.response?.data?.message || error?.message || '上传失败，请重试',
          });
        }
      }

      return target;
    },
    onSuccess: (target) => {
      queryClient.invalidateQueries({ queryKey: ['workspace-projects', workspaceId] });
      queryClient.invalidateQueries({ queryKey: ['workspace-video-assets', target?.id] });
    },
  });

  const deleteAssetMutation = useMutation({
    mutationFn: (assetId) => deleteAsset(assetId),
    onSuccess: (_, assetId) => {
      if (uploadTarget?.id) {
        queryClient.invalidateQueries({ queryKey: ['workspace-video-assets', uploadTarget.id] });
        queryClient.invalidateQueries({ queryKey: ['workspace-video-trash', uploadTarget.id] });
      }
      setPreviewAssetId((current) => (current === assetId ? null : current));
    },
  });

  const restoreAssetMutation = useMutation({
    mutationFn: (assetId) => restoreAsset(assetId),
    onSuccess: () => {
      if (uploadTarget?.id) {
        queryClient.invalidateQueries({ queryKey: ['workspace-video-assets', uploadTarget.id] });
        queryClient.invalidateQueries({ queryKey: ['workspace-video-trash', uploadTarget.id] });
      }
    },
  });

  const emptyTrashMutation = useMutation({
    mutationFn: () => emptyAssetTrash(uploadTarget.id),
    onSuccess: () => {
      if (uploadTarget?.id) {
        queryClient.invalidateQueries({ queryKey: ['workspace-video-assets', uploadTarget.id] });
        queryClient.invalidateQueries({ queryKey: ['workspace-video-trash', uploadTarget.id] });
      }
    },
  });

  const handleFiles = useCallback((fileList) => {
    const files = Array.from(fileList || []).filter((file) => file.type.startsWith('video/'));
    if (!files.length) return;
    uploadMutation.mutate(files);
  }, [uploadMutation]);

  const handleDeleteAsset = useCallback((asset) => {
    if (!asset?.id || deleteAssetMutation.isPending) return;
    if (!window.confirm(`将「${asset.name || '这个视频'}」移入回收站吗？`)) return;
    deleteAssetMutation.mutate(asset.id);
  }, [deleteAssetMutation]);

  const handleRestoreAsset = useCallback((asset) => {
    if (!asset?.id || restoreAssetMutation.isPending) return;
    restoreAssetMutation.mutate(asset.id);
  }, [restoreAssetMutation]);

  const handleEmptyTrash = useCallback(() => {
    if (!uploadTarget?.id || emptyTrashMutation.isPending) return;
    if (!window.confirm('清空回收站会彻底删除数据库记录和上传文件，无法恢复。确定继续吗？')) return;
    emptyTrashMutation.mutate();
  }, [emptyTrashMutation, uploadTarget?.id]);

  const assets = (assetsQuery.data || []).filter((asset) => (
    !searchValue.trim() || asset.name.toLowerCase().includes(searchValue.trim().toLowerCase())
  ));
  const trashAssets = trashQuery.data?.items || [];
  const trashCount = trashQuery.data?.total || 0;

  useEffect(() => {
    let cancelled = false;
    const queue = (assetsQuery.data || [])
      .filter((asset) => asset?.id && !asset.thumbnailUrl && asset.previewUrl && !assetPosterMap[asset.id])
      .slice(0, 40);

    async function run() {
      for (const asset of queue) {
        if (cancelled) return;
        const result = await captureVideoPoster(asset.previewUrl);
        if (cancelled) return;

        if (result?.posterUrl) {
          setAssetPosterMap((current) => (
            current[asset.id] ? current : { ...current, [asset.id]: result.posterUrl }
          ));
        }

        if (result?.width > 0 && result?.height > 0) {
          const ratio = `${result.width} / ${result.height}`;
          setAssetAspectRatios((current) => (
            current[asset.id] === ratio ? current : { ...current, [asset.id]: ratio }
          ));
        }
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [assetPosterMap, assetsQuery.data]);

  const handleDrop = (event) => {
    event.preventDefault();
    setDropActive(false);
    handleFiles(event.dataTransfer.files);
  };

  if (workspaceQuery.isLoading || projectsQuery.isLoading) {
    return <WorkspaceSkeleton />;
  }

  return (
    <div
      className={clsx(
        'relative min-h-[calc(100svh-5.5rem)] min-w-0 space-y-3 sm:space-y-4',
        dropActive && 'after:pointer-events-none after:absolute after:inset-0 after:z-20 after:rounded-[28px] after:border-2 after:border-dashed after:border-violet-400 after:bg-violet-500/10'
      )}
      onDragEnter={(event) => {
        event.preventDefault();
        setDropActive(true);
      }}
      onDragOver={(event) => event.preventDefault()}
      onDragLeave={(event) => {
        if (event.currentTarget === event.target) setDropActive(false);
      }}
      onDrop={handleDrop}
    >
      <section className="studio-panel overflow-hidden rounded-2xl p-3 sm:p-4 lg:p-5">
        <div className="flex flex-col gap-4">
          <div className="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <p className="studio-label">Workflow</p>
              <h2 className="mt-2 truncate text-2xl font-semibold">{workspaceQuery.data?.name || '工作区'}</h2>
              <p className="mt-2 max-w-2xl text-sm studio-muted">
                直接拖拽视频到页面任意位置即可上传，素材会自动进入工作流。
              </p>
            </div>

            <div className="flex shrink-0 flex-wrap items-center gap-2">
              <span className="rounded-full bg-surface-100 px-3 py-1 text-xs font-medium text-surface-700 dark:bg-surface-800 dark:text-surface-200">
                视频 {assetsQuery.data?.length || 0}
              </span>
              <span className="rounded-full bg-surface-100 px-3 py-1 text-xs font-medium text-surface-700 dark:bg-surface-800 dark:text-surface-200">
                上传中 {uploadItems.filter((item) => item.status === 'uploading').length}
              </span>
              <span className="rounded-full bg-surface-100 px-3 py-1 text-xs font-medium text-surface-700 dark:bg-surface-800 dark:text-surface-200">
                回收站 {trashCount}
              </span>
            </div>
          </div>

          <div className="rounded-xl border border-surface-200/70 bg-surface-50/60 p-2 dark:border-surface-700 dark:bg-surface-900/50">
            <div className="grid min-w-0 gap-2 sm:grid-cols-[minmax(0,1fr)_auto_auto]">
              <div className="min-w-0">
                <Input
                  value={searchValue}
                  onChange={(event) => setSearchValue(event.target.value)}
                  placeholder="搜索视频"
                  leftIcon={Search}
                />
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="video/*"
                multiple
                className="hidden"
                onChange={(event) => {
                  handleFiles(event.target.files);
                  event.target.value = '';
                }}
              />
              <Button className="w-full sm:w-auto" leftIcon={UploadCloud} onClick={() => fileInputRef.current?.click()} loading={uploadMutation.isPending}>
                上传视频
              </Button>
              <Button className="w-full sm:w-auto" variant="ghost" leftIcon={Trash2} onClick={() => setShowTrash((current) => !current)}>
                回收站{trashCount ? ` ${trashCount}` : ''}
              </Button>
            </div>
          </div>
        </div>
      </section>

      <UploadQueue items={uploadItems} />

      {showTrash && (
        <TrashPanel
          assets={trashAssets}
          coverMap={assetPosterMap}
          loading={trashQuery.isLoading}
          restoringId={restoreAssetMutation.variables}
          clearing={emptyTrashMutation.isPending}
          onRestore={handleRestoreAsset}
          onEmpty={handleEmptyTrash}
          onClose={() => setShowTrash(false)}
        />
      )}

      <section className="space-y-3">
        {assetsQuery.isLoading ? (
          <div className="workspace-video-grid">
            {Array.from({ length: 8 }).map((_, index) => (
              <Skeleton key={index} className="h-44 w-full rounded-2xl" />
            ))}
          </div>
        ) : assets.length === 0 ? (
          <div className="studio-panel rounded-2xl p-8">
            <EmptyState
              icon={UploadCloud}
              title="拖拽视频开始工作流"
              description="支持多个视频同时上传，上传后会自动进入后台处理。"
              actionLabel="选择视频"
              onAction={() => fileInputRef.current?.click()}
            />
          </div>
        ) : (
          <div className="workspace-video-grid">
            {assets.map((asset) => (
              <VideoCard
                key={asset.id}
                asset={asset}
                coverUrl={asset.thumbnailUrl || assetPosterMap[asset.id] || null}
                aspectRatio={assetAspectRatios[asset.id] || asset.aspectRatio}
                onAspectRatio={(assetId, aspectRatio) => {
                  setAssetAspectRatios((current) => (
                    current[assetId] === aspectRatio ? current : { ...current, [assetId]: aspectRatio }
                  ));
                }}
                deleting={deleteAssetMutation.isPending && deleteAssetMutation.variables === asset.id}
                onDelete={handleDeleteAsset}
                onPreview={(item) => setPreviewAssetId(item.id)}
              />
            ))}
          </div>
        )}
      </section>

      <FloatingPreview
        asset={previewAsset}
        aspectRatio={previewAsset ? (assetAspectRatios[previewAsset.id] || previewAsset.aspectRatio) : '16 / 9'}
        detail={previewQuery.data}
        loading={previewQuery.isLoading}
        onAspectRatio={(assetId, aspectRatio) => {
          setAssetAspectRatios((current) => (
            current[assetId] === aspectRatio ? current : { ...current, [assetId]: aspectRatio }
          ));
        }}
        onClose={() => setPreviewAssetId(null)}
        onOpenReview={(asset) => navigate(`/review/${asset.id}`)}
      />
    </div>
  );
}
