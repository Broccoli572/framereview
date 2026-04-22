import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Check,
  CheckCheck,
  Film,
  Maximize2,
  MessageSquare,
  Pause,
  Play,
  RefreshCw,
  Send,
  Volume2,
  VolumeX,
  Waves,
} from 'lucide-react';
import clsx from 'clsx';
import client from '../api/client';
import { processAsset } from '../api/assets';
import {
  addComment,
  createThread,
  getReviewStatus,
  getThreads,
  resolveThread,
  setAssetApproval,
  unresolveThread,
} from '../api/reviews';
import Avatar from '../components/ui/Avatar';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import EmptyState from '../components/ui/EmptyState';
import Skeleton from '../components/ui/Skeleton';
import Textarea from '../components/ui/Textarea';
import { formatDuration, formatTimecode } from '../lib/utils';
import { getReviewApprovalMeta, normalizeAsset, normalizeReviewThread } from '../lib/view-models';

function resolveMediaUrl(asset, selectedVersion) {
  return (
    selectedVersion?.preview?.proxyUrl ||
    selectedVersion?.preview?.hlsUrl ||
    selectedVersion?.preview?.posterUrl ||
    selectedVersion?.fileUrl ||
    selectedVersion?.file_url ||
    asset?.preview?.proxyUrl ||
    asset?.url ||
    asset?.file_url ||
    asset?.storagePath ||
    null
  );
}

function ReviewSkeleton() {
  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
      <section className="space-y-5">
        <div className="rounded-[26px] border border-surface-200 bg-white p-5 shadow-sm dark:border-surface-800 dark:bg-surface-900">
          <div className="space-y-3">
            <Skeleton className="h-4 w-24 rounded-lg" />
            <Skeleton className="h-8 w-72 rounded-lg" />
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} className="h-24 w-full rounded-2xl" />
            ))}
          </div>
        </div>
        <div className="overflow-hidden rounded-[26px] border border-surface-200 bg-white shadow-sm dark:border-surface-800 dark:bg-surface-900">
          <Skeleton className="h-[420px] w-full rounded-none" />
          <div className="space-y-4 p-4">
            <Skeleton className="h-14 w-full rounded-2xl" />
            <Skeleton className="h-14 w-full rounded-2xl" />
          </div>
        </div>
      </section>
      <aside className="rounded-[26px] border border-surface-200 bg-white p-5 shadow-sm dark:border-surface-800 dark:bg-surface-900">
        <div className="space-y-4">
          <Skeleton className="h-5 w-28 rounded-lg" />
          <Skeleton className="h-24 w-full rounded-2xl" />
          <Skeleton className="h-28 w-full rounded-2xl" />
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-24 w-full rounded-2xl" />
          ))}
        </div>
      </aside>
    </div>
  );
}

function ThreadListSkeleton() {
  return (
    <div className="space-y-3 px-5 py-4">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="space-y-2 rounded-2xl border border-surface-200 p-4 dark:border-surface-800">
          <Skeleton className="h-3 w-24 rounded-lg" />
          <Skeleton className="h-4 w-full rounded-lg" />
          <Skeleton className="h-3 w-32 rounded-lg" />
        </div>
      ))}
    </div>
  );
}

export default function ReviewPage() {
  const { assetId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const mediaRef = useRef(null);
  const timelineRef = useRef(null);

  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [selectedVersionId, setSelectedVersionId] = useState('');
  const [activeThreadId, setActiveThreadId] = useState(null);
  const [draftTimecode, setDraftTimecode] = useState(null);
  const [message, setMessage] = useState('');

  const assetQuery = useQuery({
    queryKey: ['asset', assetId],
    queryFn: async () => {
      const response = await client.get(`/assets/${assetId}`);
      return response.data?.data || response.data || null;
    },
    enabled: Boolean(assetId),
  });

  const assetViewModel = useMemo(
    () => (assetQuery.data ? normalizeAsset(assetQuery.data) : null),
    [assetQuery.data]
  );

  const projectQuery = useQuery({
    queryKey: ['review-project', assetViewModel?.projectId],
    queryFn: async () => {
      const response = await client.get(`/projects/${assetViewModel.projectId}`);
      const payload = response.data?.data || response.data || null;
      return payload
        ? {
            ...payload,
            workspaceName: payload.workspace?.name || null,
            workspaceId: payload.workspaceId || payload.workspace?.id || null,
          }
        : null;
    },
    enabled: Boolean(assetViewModel?.projectId),
  });

  const versionsQuery = useQuery({
    queryKey: ['asset-versions', assetId],
    queryFn: async () => {
      const response = await client.get(`/assets/${assetId}/versions`);
      return response.data?.data || response.data || [];
    },
    enabled: Boolean(assetId),
  });

  const threadsQuery = useQuery({
    queryKey: ['asset-threads', assetId],
    queryFn: async () => {
      const response = await getThreads(assetId);
      const payload = response.data?.data || response.data?.threads || response.data || [];
      return payload.map(normalizeReviewThread);
    },
    enabled: Boolean(assetId),
  });

  const reviewStatusQuery = useQuery({
    queryKey: ['asset-review-status', assetId],
    queryFn: async () => {
      const response = await getReviewStatus(assetId);
      return response.data?.data || response.data || {};
    },
    enabled: Boolean(assetId),
  });

  const retryProcessingMutation = useMutation({
    mutationFn: () => processAsset(assetId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['asset', assetId] });
      queryClient.invalidateQueries({ queryKey: ['asset-versions', assetId] });
    },
  });

  const createThreadMutation = useMutation({
    mutationFn: ({ body, timecode }) => createThread(assetId, { body, timecode }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['asset-threads', assetId] });
      queryClient.invalidateQueries({ queryKey: ['asset-review-status', assetId] });
      setMessage('');
      setDraftTimecode(null);
    },
  });

  const addCommentMutation = useMutation({
    mutationFn: ({ threadId, body }) => addComment(threadId, { body }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['asset-threads', assetId] });
      queryClient.invalidateQueries({ queryKey: ['asset-review-status', assetId] });
      setMessage('');
    },
  });

  const resolveThreadMutation = useMutation({
    mutationFn: (threadId) => resolveThread(threadId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['asset-threads', assetId] });
      queryClient.invalidateQueries({ queryKey: ['asset-review-status', assetId] });
    },
  });

  const reopenThreadMutation = useMutation({
    mutationFn: (threadId) => unresolveThread(threadId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['asset-threads', assetId] });
      queryClient.invalidateQueries({ queryKey: ['asset-review-status', assetId] });
    },
  });

  const approvalMutation = useMutation({
    mutationFn: (status) => setAssetApproval(assetId, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['asset-review-status', assetId] });
      queryClient.invalidateQueries({ queryKey: ['asset-threads', assetId] });
    },
  });

  const versions = versionsQuery.data || [];

  useEffect(() => {
    if (!selectedVersionId && versions.length > 0) {
      setSelectedVersionId(versions[0].id);
    }
  }, [selectedVersionId, versions]);

  useEffect(() => {
    if (!assetViewModel?.isProcessing) return undefined;

    const timer = window.setInterval(() => {
      queryClient.invalidateQueries({ queryKey: ['asset', assetId] });
      queryClient.invalidateQueries({ queryKey: ['asset-versions', assetId] });
      queryClient.invalidateQueries({ queryKey: ['asset-review-status', assetId] });
    }, 4000);

    return () => window.clearInterval(timer);
  }, [assetId, assetViewModel?.isProcessing, queryClient]);

  const selectedVersion = versions.find((version) => version.id === selectedVersionId) || versions[0] || null;
  const mediaUrl = resolveMediaUrl(assetQuery.data, selectedVersion);
  const threads = useMemo(
    () => [...(threadsQuery.data || [])].sort((a, b) => a.timecode - b.timecode),
    [threadsQuery.data]
  );
  const activeThread = threads.find((thread) => thread.id === activeThreadId) || null;
  const reviewMeta = getReviewApprovalMeta(reviewStatusQuery.data?.status);
  const unresolvedCount = threads.filter((thread) => !thread.resolved).length;
  const resolvedCount = threads.filter((thread) => thread.resolved).length;
  const selectedTimecode = draftTimecode ?? activeThread?.timecode ?? currentTime;
  const timelineFocusThread = activeThread || (draftTimecode != null
    ? {
        id: 'draft',
        resolved: false,
        previewText: '当前时间点的新批注',
        timecode: draftTimecode,
      }
    : null);

  const handleTimeUpdate = () => {
    if (mediaRef.current) {
      setCurrentTime(mediaRef.current.currentTime || 0);
    }
  };

  const handleLoadedMetadata = () => {
    if (mediaRef.current) {
      setDuration(mediaRef.current.duration || 0);
    }
  };

  const seekTo = (timecode) => {
    if (!mediaRef.current || !Number.isFinite(timecode)) return;
    mediaRef.current.currentTime = Math.max(0, Math.min(timecode, duration || timecode));
    setCurrentTime(mediaRef.current.currentTime);
  };

  const togglePlay = async () => {
    if (!mediaRef.current) return;

    if (isPlaying) {
      mediaRef.current.pause();
    } else {
      try {
        await mediaRef.current.play();
      } catch {
        setIsPlaying(false);
      }
    }
  };

  const toggleMute = () => {
    if (!mediaRef.current) return;
    const nextMuted = !muted;
    mediaRef.current.muted = nextMuted;
    setMuted(nextMuted);
  };

  const handleVolumeChange = (event) => {
    const nextValue = Number(event.target.value);
    setVolume(nextValue);
    if (!mediaRef.current) return;
    mediaRef.current.volume = nextValue;
    mediaRef.current.muted = nextValue === 0;
    setMuted(nextValue === 0);
  };

  const handleTimelineClick = (event) => {
    if (!timelineRef.current || !duration) return;
    const rect = timelineRef.current.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
    const nextTimecode = ratio * duration;

    setActiveThreadId(null);
    setDraftTimecode(nextTimecode);
    seekTo(nextTimecode);
  };

  const handleSubmit = () => {
    const body = message.trim();
    if (!body) return;

    if (activeThread?.id) {
      addCommentMutation.mutate({ threadId: activeThread.id, body });
      return;
    }

    createThreadMutation.mutate({
      body,
      timecode: Number.isFinite(selectedTimecode) ? selectedTimecode : 0,
    });
  };

  const mediaType = assetViewModel?.mediaType || assetQuery.data?.type || 'video';
  const isVisualTimeline = ['video', 'audio'].includes(mediaType) && duration > 0;

  if (assetQuery.isLoading) {
    return <ReviewSkeleton />;
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
      <section className="space-y-5">
        <div className="rounded-[26px] border border-surface-200 bg-white p-5 shadow-sm dark:border-surface-800 dark:bg-surface-900">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <button
                type="button"
                className="inline-flex items-center gap-2 text-sm text-surface-500 transition-colors hover:text-surface-900 dark:text-surface-400 dark:hover:text-surface-100"
                onClick={() => navigate(assetViewModel?.projectId ? `/project/${assetViewModel.projectId}` : -1)}
              >
                <ArrowLeft size={16} />
                返回项目
              </button>
              <p className="mt-3 text-sm font-medium text-surface-500 dark:text-surface-400">审阅</p>
              <h2 className="mt-2 truncate text-2xl font-semibold">{assetViewModel?.name || '素材审阅'}</h2>
              <p className="mt-2 text-sm text-surface-500 dark:text-surface-400">
                {projectQuery.data?.workspaceName ? `${projectQuery.data.workspaceName} / ` : null}
                {projectQuery.data?.name || '当前项目'} · {assetViewModel?.sizeLabel || '--'} · {assetViewModel?.durationLabel || '--'}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Badge variant={assetViewModel?.statusVariant || 'default'}>{assetViewModel?.statusLabel || '未知'}</Badge>
              <Badge variant={reviewMeta.variant}>{reviewMeta.label}</Badge>
              {versions.length ? (
                <select
                  value={selectedVersionId}
                  onChange={(event) => setSelectedVersionId(event.target.value)}
                  className="rounded-xl border border-surface-300 bg-white px-3 py-2 text-sm dark:border-surface-700 dark:bg-surface-900 dark:text-surface-100"
                >
                  {versions.map((version) => (
                    <option key={version.id} value={version.id}>
                      版本 {version.versionNumber}
                    </option>
                  ))}
                </select>
              ) : null}
            </div>
          </div>

          {assetViewModel?.status === 'processing' ? (
            <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900/40 dark:bg-amber-900/10 dark:text-amber-200">
              正在处理，页面会自动刷新。
            </div>
          ) : null}

          {assetViewModel?.status === 'failed' ? (
            <div className="mt-4 flex flex-wrap items-center gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/40 dark:bg-red-900/10 dark:text-red-200">
              <span>处理失败。</span>
              <Button size="sm" variant="secondary" leftIcon={RefreshCw} onClick={() => retryProcessingMutation.mutate()}>
                重新处理
              </Button>
            </div>
          ) : null}

          <div className="mt-4 flex flex-wrap gap-3">
            <Button
              size="sm"
              variant="secondary"
              leftIcon={CheckCheck}
              onClick={() => approvalMutation.mutate('approved')}
              disabled={approvalMutation.isPending || assetViewModel?.status !== 'ready'}
            >
              通过
            </Button>
            <Button
              size="sm"
              variant="secondary"
              leftIcon={MessageSquare}
              onClick={() => approvalMutation.mutate('needs_review')}
              disabled={approvalMutation.isPending || assetViewModel?.status === 'processing'}
            >
              待处理
            </Button>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-3">
            <div className="rounded-2xl bg-surface-50 p-4 dark:bg-surface-950">
              <p className="text-sm text-surface-500 dark:text-surface-400">版本</p>
              <p className="mt-2 text-xl font-semibold">
                {selectedVersion?.versionNumber ? `v${selectedVersion.versionNumber}` : '--'}
              </p>
            </div>
            <div className="rounded-2xl bg-surface-50 p-4 dark:bg-surface-950">
              <p className="text-sm text-surface-500 dark:text-surface-400">待处理</p>
              <p className="mt-2 text-xl font-semibold">{unresolvedCount}</p>
            </div>
            <div className="rounded-2xl bg-surface-50 p-4 dark:bg-surface-950">
              <p className="text-sm text-surface-500 dark:text-surface-400">已解决</p>
              <p className="mt-2 text-xl font-semibold">{resolvedCount}</p>
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-[26px] border border-surface-200 bg-white shadow-sm dark:border-surface-800 dark:bg-surface-900">
          <div className="relative flex min-h-[320px] items-center justify-center bg-surface-950 md:min-h-[420px]">
            {!mediaUrl ? (
              <div className="flex flex-col items-center gap-3 px-6 text-center text-surface-400">
                <Film size={42} />
                <p className="text-sm">暂无预览</p>
              </div>
            ) : mediaType === 'image' ? (
              <img src={mediaUrl} alt={assetViewModel?.name} className="max-h-[70vh] w-full object-contain" />
            ) : mediaType === 'audio' ? (
              <div className="flex w-full max-w-xl flex-col items-center gap-6 rounded-[24px] border border-surface-800 bg-surface-900 px-8 py-10">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-surface-800 text-white">
                  <Waves size={32} />
                </div>
                <p className="text-sm text-surface-300">{assetViewModel?.name}</p>
                <audio
                  ref={mediaRef}
                  src={mediaUrl}
                  className="hidden"
                  onTimeUpdate={handleTimeUpdate}
                  onLoadedMetadata={handleLoadedMetadata}
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                />
              </div>
            ) : (
              <video
                ref={mediaRef}
                src={mediaUrl}
                className="max-h-[70vh] w-full object-contain"
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                onEnded={() => setIsPlaying(false)}
                playsInline
              />
            )}

            {mediaUrl && mediaType === 'video' && !isPlaying ? (
              <button
                type="button"
                className="absolute inset-0 flex items-center justify-center"
                onClick={togglePlay}
              >
                <span className="flex h-16 w-16 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur">
                  <Play size={28} className="ml-1" />
                </span>
              </button>
            ) : null}
          </div>

          <div className="border-t border-surface-200 bg-surface-950 px-4 py-4 text-white dark:border-surface-800">
            {isVisualTimeline ? (
              <div>
                <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-surface-800 bg-surface-900/80 px-4 py-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.14em] text-surface-500">时间点</p>
                    <p className="mt-1 text-sm font-medium">
                      {timelineFocusThread
                        ? formatTimecode(timelineFocusThread.timecode || 0)
                        : formatTimecode(currentTime)}
                    </p>
                  </div>
                  <div className="max-w-[520px] text-sm text-surface-300">
                    {timelineFocusThread ? timelineFocusThread.previewText : '点击时间轴添加批注'}
                  </div>
                </div>

                <div
                  ref={timelineRef}
                  className="relative h-14 cursor-pointer"
                  onClick={handleTimelineClick}
                >
                  <div className="absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-surface-700">
                    <div
                      className="h-full rounded-full bg-brand-500"
                      style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}
                    />
                  </div>

                  <div
                    className="pointer-events-none absolute top-1/2 z-20 h-8 w-[2px] -translate-y-1/2 bg-white/90 shadow-[0_0_0_4px_rgba(255,255,255,0.08)]"
                    style={{ left: `calc(${duration ? (currentTime / duration) * 100 : 0}% - 1px)` }}
                  />
                  <div
                    className="pointer-events-none absolute top-0 z-20 -translate-x-1/2 rounded-full bg-white px-2 py-1 text-[11px] font-medium text-surface-900"
                    style={{ left: `${duration ? (currentTime / duration) * 100 : 0}%` }}
                  >
                    {formatDuration(currentTime)}
                  </div>

                  {threads.map((thread) => (
                    <button
                      key={thread.id}
                      type="button"
                      className={clsx(
                        'absolute top-1/2 h-4 w-4 -translate-y-1/2 rounded-full border-[3px] border-surface-950 transition-transform',
                        thread.resolved ? 'bg-surface-500' : 'bg-amber-400',
                        activeThreadId === thread.id && 'scale-125 ring-2 ring-white/70'
                      )}
                      style={{ left: `calc(${duration ? (thread.timecode / duration) * 100 : 0}% - 8px)` }}
                      onClick={(event) => {
                        event.stopPropagation();
                        setActiveThreadId(thread.id);
                        setDraftTimecode(null);
                        seekTo(thread.timecode);
                      }}
                      title={`${thread.timecodeLabel} · ${thread.previewText}`}
                    />
                  ))}

                  {draftTimecode != null ? (
                    <div
                      className="absolute top-1/2 h-10 w-[3px] -translate-y-1/2 rounded-full bg-white/95"
                      style={{ left: `calc(${duration ? (draftTimecode / duration) * 100 : 0}% - 2px)` }}
                    />
                  ) : null}
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <Button size="sm" variant="secondary" onClick={togglePlay}>
                    {isPlaying ? <Pause size={14} /> : <Play size={14} />}
                  </Button>
                  <div className="text-sm text-surface-300">
                    {formatDuration(currentTime)} / {formatDuration(duration)}
                  </div>
                  <select
                    value={playbackRate}
                    onChange={(event) => {
                      const nextRate = Number(event.target.value);
                      setPlaybackRate(nextRate);
                      if (mediaRef.current) {
                        mediaRef.current.playbackRate = nextRate;
                      }
                    }}
                    className="rounded-lg bg-surface-900 px-2 py-1 text-sm text-surface-200"
                  >
                    <option value="0.5">0.5x</option>
                    <option value="1">1x</option>
                    <option value="1.25">1.25x</option>
                    <option value="1.5">1.5x</option>
                    <option value="2">2x</option>
                  </select>
                  <button type="button" className="rounded-lg p-2 text-surface-300 hover:bg-surface-900" onClick={toggleMute}>
                    {muted || volume === 0 ? <VolumeX size={16} /> : <Volume2 size={16} />}
                  </button>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={muted ? 0 : volume}
                    onChange={handleVolumeChange}
                    className="w-24 accent-brand-500"
                  />
                  <button
                    type="button"
                    className="rounded-lg p-2 text-surface-300 hover:bg-surface-900"
                    onClick={() => mediaRef.current?.requestFullscreen?.()}
                  >
                    <Maximize2 size={16} />
                  </button>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-surface-800 bg-surface-900 px-4 py-3 text-sm text-surface-300">
                {mediaType === 'image' ? '图片素材没有时间轴。' : '当前素材没有可用时间轴。'}
              </div>
            )}
          </div>
        </div>
      </section>

      <aside className="rounded-[26px] border border-surface-200 bg-white shadow-sm dark:border-surface-800 dark:bg-surface-900">
        <div className="border-b border-surface-200 px-5 py-5 dark:border-surface-800">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-surface-500 dark:text-surface-400">批注</p>
              <h3 className="mt-1 text-lg font-semibold">线程</h3>
            </div>
            <Badge variant={unresolvedCount ? 'warning' : 'success'}>
              {unresolvedCount ? `${unresolvedCount} 待处理` : '已清空'}
            </Badge>
          </div>

          <div className="mt-4 rounded-2xl bg-surface-50 p-4 dark:bg-surface-950">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-surface-400">当前位置</p>
            <p className="mt-2 text-sm font-medium">{formatTimecode(selectedTimecode || 0)}</p>
            <p className="mt-1 text-xs text-surface-500 dark:text-surface-400">
              {activeThread ? '回复当前线程' : '创建新线程'}
            </p>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                setActiveThreadId(null);
                setDraftTimecode(currentTime);
              }}
            >
              在当前时间点批注
            </Button>
            {activeThread ? (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setActiveThreadId(null);
                  setDraftTimecode(currentTime);
                }}
              >
                新线程
              </Button>
            ) : null}
          </div>
        </div>

        <div className="border-b border-surface-200 px-5 py-4 dark:border-surface-800">
          <div className="space-y-3">
            <Textarea
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder={activeThread ? '回复线程' : `在 ${formatDuration(selectedTimecode || 0)} 添加批注`}
              className="min-h-[96px]"
            />
            <div className="flex justify-end">
              <Button
                leftIcon={Send}
                onClick={handleSubmit}
                loading={createThreadMutation.isPending || addCommentMutation.isPending}
                disabled={!message.trim()}
              >
                发送
              </Button>
            </div>
          </div>
        </div>

        <div className="overflow-y-visible md:max-h-[calc(100vh-18rem)] md:overflow-y-auto">
          {threadsQuery.isLoading ? (
            <ThreadListSkeleton />
          ) : threads.length === 0 ? (
            <EmptyState
              icon={MessageSquare}
              compact
              title="还没有批注"
              description="从时间轴开始。"
            />
          ) : (
            <div className="divide-y divide-surface-200 dark:divide-surface-800">
              {threads.map((thread) => (
                <div
                  key={thread.id}
                  className={clsx(
                    'border-l-2 px-5 py-4 transition-colors',
                    activeThreadId === thread.id
                      ? 'border-l-brand-500 bg-brand-50/70 dark:bg-brand-900/10'
                      : thread.resolved
                        ? 'border-l-surface-200 hover:bg-surface-50 dark:border-l-surface-800 dark:hover:bg-surface-950'
                        : 'border-l-amber-400/80 hover:bg-surface-50 dark:hover:bg-surface-950'
                  )}
                >
                  <button
                    type="button"
                    className="w-full text-left"
                    onClick={() => {
                      setActiveThreadId(thread.id);
                      setDraftTimecode(null);
                      if (duration) {
                        seekTo(thread.timecode);
                      }
                    }}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-mono text-xs text-surface-500 dark:text-surface-400">{formatTimecode(thread.timecode)}</p>
                      <Badge variant={thread.resolved ? 'success' : 'warning'}>
                        {thread.resolved ? '已解决' : '待处理'}
                      </Badge>
                    </div>
                    <p className="mt-2 text-sm font-medium leading-6">{thread.previewText}</p>
                    <div className="mt-3 flex items-center gap-2 text-xs text-surface-500 dark:text-surface-400">
                      <Avatar src={thread.author?.avatar} name={thread.author?.name} size="xs" />
                      <span>{thread.author?.name || '成员'}</span>
                      <span>·</span>
                      <span>{thread.commentCount} 条</span>
                    </div>
                  </button>

                  {activeThreadId === thread.id ? (
                    <div className="mt-4 space-y-3 rounded-2xl border border-surface-200 bg-white p-4 dark:border-surface-800 dark:bg-surface-900">
                      {thread.comments.map((comment) => (
                        <div key={comment.id} className="flex gap-3">
                          <Avatar src={comment.user?.avatar} name={comment.user?.name} size="sm" />
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-sm font-medium">{comment.user?.name || '成员'}</span>
                              <span className="text-xs text-surface-400">
                                {comment.createdAt ? new Date(comment.createdAt).toLocaleString('zh-CN') : ''}
                              </span>
                            </div>
                            <p className="mt-1 text-sm leading-6 text-surface-600 dark:text-surface-300">{comment.body}</p>
                          </div>
                        </div>
                      ))}

                      <div className="flex flex-wrap gap-2 pt-2">
                        {thread.resolved ? (
                          <Button
                            size="sm"
                            variant="secondary"
                            leftIcon={RefreshCw}
                            onClick={() => reopenThreadMutation.mutate(thread.id)}
                          >
                            重新打开
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="secondary"
                            leftIcon={Check}
                            onClick={() => resolveThreadMutation.mutate(thread.id)}
                          >
                            标记已解决
                          </Button>
                        )}
                      </div>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
