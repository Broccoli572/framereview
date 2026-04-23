import { useCallback, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, CheckCircle2, Film, Loader2, Maximize2, Search, UploadCloud, X } from 'lucide-react';
import clsx from 'clsx';
import client from '../api/client';
import { finalizeUpload, initiateUpload, listAssets, uploadAsset, uploadChunk } from '../api/assets';
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

function WorkspaceSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-36 w-full rounded-2xl" />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <Skeleton key={index} className="h-56 w-full rounded-2xl" />
        ))}
      </div>
    </div>
  );
}

function VideoCard({ asset, onPreview }) {
  return (
    <button
      type="button"
      className="studio-card group overflow-hidden rounded-2xl text-left"
      onClick={() => onPreview(asset)}
    >
      <div className="studio-thumb relative overflow-hidden" style={{ aspectRatio: asset.aspectRatio }}>
        {asset.thumbnailUrl ? (
          <img
            src={asset.thumbnailUrl}
            alt={asset.name}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
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

      <div className="space-y-2 p-3">
        <p className="line-clamp-1 text-sm font-semibold">{asset.name}</p>
        <div className="flex items-center justify-between gap-3 text-xs studio-muted">
          <span>{asset.sizeLabel}</span>
          <span>{asset.updatedLabel}</span>
        </div>
      </div>
    </button>
  );
}

function UploadQueue({ items }) {
  if (!items.length) return null;

  return (
    <section className="studio-panel rounded-2xl p-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">上传队列</p>
          <p className="mt-0.5 text-xs studio-muted">{items.length} 个文件</p>
        </div>
      </div>

      <div className="mt-3 space-y-2">
        {items.slice(0, 3).map((item) => (
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

function FloatingPreview({ asset, detail, loading, onClose, onOpenReview }) {
  if (!asset) return null;

  const mediaUrl = resolveMediaUrl(asset, detail);

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/45 p-4 backdrop-blur-md"
      onClick={onClose}
    >
      <div
        className="w-full max-w-6xl rounded-[28px] border border-white/10 bg-zinc-950/94 p-3 text-white shadow-2xl shadow-black/40"
        onClick={(event) => event.stopPropagation()}
      >
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="max-h-[72vh] overflow-hidden rounded-2xl bg-black" style={{ aspectRatio: asset.aspectRatio }}>
          {loading ? (
            <div className="flex h-full items-center justify-center">
              <Loader2 className="animate-spin" size={28} />
            </div>
          ) : mediaUrl ? (
            <video src={mediaUrl} controls playsInline className="h-full w-full object-contain" />
          ) : asset.thumbnailUrl ? (
            <img src={asset.thumbnailUrl} alt={asset.name} className="h-full w-full object-contain" />
          ) : (
            <div className="flex h-full items-center justify-center text-zinc-500">
              <Film size={36} />
            </div>
          )}
        </div>

        <aside className="flex min-w-0 flex-col justify-between gap-4 rounded-2xl bg-white/[0.06] p-4">
          <div className="min-w-0">
            <div className="flex items-start justify-between gap-3">
              <Badge variant={asset.statusVariant}>{asset.statusLabel}</Badge>
              <button type="button" className="rounded-lg p-1.5 text-zinc-400 hover:bg-white/10 hover:text-white" onClick={onClose}>
                <X size={16} />
              </button>
            </div>
            <h3 className="mt-3 line-clamp-2 text-base font-semibold">{asset.name}</h3>
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-zinc-300">
              <div className="rounded-xl bg-black/20 p-2">
                <p className="text-zinc-500">时长</p>
                <p className="mt-1 font-medium text-white">{asset.durationLabel}</p>
              </div>
              <div className="rounded-xl bg-black/20 p-2">
                <p className="text-zinc-500">体积</p>
                <p className="mt-1 font-medium text-white">{asset.sizeLabel}</p>
              </div>
              <div className="col-span-2 rounded-xl bg-black/20 p-2">
                <p className="text-zinc-500">更新</p>
                <p className="mt-1 font-medium text-white">{asset.updatedLabel}</p>
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

  const handleFiles = useCallback((fileList) => {
    const files = Array.from(fileList || []).filter((file) => file.type.startsWith('video/'));
    if (!files.length) return;
    uploadMutation.mutate(files);
  }, [uploadMutation]);

  const assets = (assetsQuery.data || []).filter((asset) => (
    !searchValue.trim() || asset.name.toLowerCase().includes(searchValue.trim().toLowerCase())
  ));

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
        'relative min-h-[calc(100vh-6.25rem)] space-y-4',
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
      <section className="studio-panel overflow-hidden rounded-2xl p-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <p className="studio-label">Workflow</p>
            <h2 className="mt-2 truncate text-2xl font-semibold">{workspaceQuery.data?.name || '工作区'}</h2>
            <p className="mt-2 text-sm studio-muted">
              拖拽视频到页面任意位置即可上传，素材会直接出现在下方工作流。
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="w-full min-w-[220px] sm:w-72">
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
            <Button leftIcon={UploadCloud} onClick={() => fileInputRef.current?.click()} loading={uploadMutation.isPending}>
              上传视频
            </Button>
          </div>
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          <div className="studio-stat rounded-xl p-3">
            <p className="studio-label">视频</p>
            <p className="mt-2 text-xl font-semibold">{assetsQuery.data?.length || 0}</p>
          </div>
          <div className="studio-stat rounded-xl p-3">
            <p className="studio-label">上传中</p>
            <p className="mt-2 text-xl font-semibold">{uploadItems.filter((item) => item.status === 'uploading').length}</p>
          </div>
          <div className="studio-stat rounded-xl p-3">
            <p className="studio-label">最近更新</p>
            <p className="mt-2 text-sm font-medium">
              {assetsQuery.data?.[0]?.updatedAt ? formatRelativeTime(assetsQuery.data[0].updatedAt) : '--'}
            </p>
          </div>
        </div>
      </section>

      <UploadQueue items={uploadItems} />

      <section className="space-y-3">
        {assetsQuery.isLoading ? (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, index) => (
              <Skeleton key={index} className="h-56 w-full rounded-2xl" />
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
          <div className="grid auto-rows-auto gap-3 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-5">
            {assets.map((asset) => (
              <VideoCard key={asset.id} asset={asset} onPreview={(item) => setPreviewAssetId(item.id)} />
            ))}
          </div>
        )}
      </section>

      <FloatingPreview
        asset={previewAsset}
        detail={previewQuery.data}
        loading={previewQuery.isLoading}
        onClose={() => setPreviewAssetId(null)}
        onOpenReview={(asset) => navigate(`/review/${asset.id}`)}
      />
    </div>
  );
}
