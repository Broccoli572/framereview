import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  SkipBack,
  SkipForward,
  MessageSquare,
  Film,
  Send,
  Check,
  ArrowLeft,
} from 'lucide-react';
import clsx from 'clsx';
import client from '../api/client';
import Avatar from '../components/ui/Avatar';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Spinner from '../components/ui/Spinner';
import EmptyState from '../components/ui/EmptyState';
import { formatDuration } from '../lib/utils';
import { addComment, createThread, getThreads, resolveThread } from '../api/reviews';

function normalizeThread(thread) {
  const comments = (thread.comments || []).map((comment) => ({
    ...comment,
    createdAt: comment.createdAt || comment.created_at || null,
  }));
  const firstComment = comments[0];

  return {
    ...thread,
    comments,
    timecode: thread.timecodeSeconds ?? 0,
    content: firstComment?.content || '',
    user: firstComment?.user || null,
    createdAt: firstComment?.createdAt || thread.createdAt || null,
    resolved: thread.status === 'resolved',
  };
}

function resolveMediaUrl(asset, versions, selectedVersion) {
  const currentVersion = selectedVersion || versions?.[0] || asset;

  return (
    currentVersion?.preview?.proxyUrl ||
    currentVersion?.preview?.hlsUrl ||
    currentVersion?.url ||
    currentVersion?.file_url ||
    currentVersion?.storagePath ||
    asset?.url ||
    asset?.file_url ||
    asset?.storagePath ||
    null
  );
}

export default function ReviewPage() {
  const { assetId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const videoRef = useRef(null);
  const timelineRef = useRef(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [showThreads, setShowThreads] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [activeThread, setActiveThread] = useState(null);
  const [selectedVersion, setSelectedVersion] = useState(null);
  const [commentMode, setCommentMode] = useState(false);

  const { data: asset, isLoading } = useQuery({
    queryKey: ['asset', assetId],
    queryFn: async () => {
      const res = await client.get(`/assets/${assetId}`);
      return res.data?.data || res.data;
    },
    enabled: !!assetId,
  });

  const { data: versions } = useQuery({
    queryKey: ['asset-versions', assetId],
    queryFn: async () => {
      const res = await client.get(`/assets/${assetId}/versions`);
      return res.data?.data || res.data || [];
    },
    enabled: !!assetId,
  });

  const { data: threads = [], isLoading: threadsLoading } = useQuery({
    queryKey: ['asset-threads', assetId],
    queryFn: async () => {
      const res = await getThreads(assetId);
      const rawThreads = res.data?.data || res.data?.threads || res.data || [];
      return rawThreads.map(normalizeThread);
    },
    enabled: !!assetId,
  });

  const addCommentMutation = useMutation({
    mutationFn: ({ threadId, body }) => addComment(threadId, { body }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['asset-threads', assetId] });
      setCommentText('');
    },
  });

  const createThreadMutation = useMutation({
    mutationFn: ({ timecode, body }) => createThread(assetId, { timecode, body }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['asset-threads', assetId] });
      setCommentText('');
      setCommentMode(false);
      setActiveThread(null);
    },
  });

  const resolveMutation = useMutation({
    mutationFn: (threadId) => resolveThread(threadId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['asset-threads', assetId] });
    },
  });

  const orderedThreads = useMemo(
    () => [...threads].sort((a, b) => (a.timecode || 0) - (b.timecode || 0)),
    [threads]
  );

  const videoUrl = resolveMediaUrl(asset, versions, selectedVersion);

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration || 0);
    }
  };

  const togglePlay = () => {
    if (!videoRef.current) return;

    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
  };

  const seek = (time) => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = Math.max(0, Math.min(time, duration || time));
    setCurrentTime(videoRef.current.currentTime);
  };

  const handleTimelineClick = (event) => {
    if (!timelineRef.current || !duration) return;

    const rect = timelineRef.current.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, x / rect.width));
    const timecode = ratio * duration;

    seek(timecode);

    if (commentMode) {
      setActiveThread({ timecode, isNew: true, comments: [] });
      setCommentMode(false);
    }
  };

  const handleThreadClick = (thread) => {
    setActiveThread(thread);
    if (thread.timecode != null) {
      seek(thread.timecode);
    }
  };

  const handleSubmitComment = () => {
    const body = commentText.trim();
    if (!body) return;

    if (activeThread?.isNew) {
      createThreadMutation.mutate({ timecode: activeThread.timecode, body });
      return;
    }

    if (activeThread?.id) {
      addCommentMutation.mutate({ threadId: activeThread.id, body });
      return;
    }

    createThreadMutation.mutate({ timecode: currentTime, body });
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    const nextMuted = !muted;
    videoRef.current.muted = nextMuted;
    setMuted(nextMuted);
  };

  const changeVolume = (event) => {
    const nextVolume = parseFloat(event.target.value);
    setVolume(nextVolume);

    if (videoRef.current) {
      videoRef.current.volume = nextVolume;
      const nextMuted = nextVolume === 0;
      videoRef.current.muted = nextMuted;
      setMuted(nextMuted);
    }
  };

  const changePlaybackRate = (nextRate) => {
    setPlaybackRate(nextRate);
    if (videoRef.current) {
      videoRef.current.playbackRate = nextRate;
    }
  };

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') return;

      switch (event.key) {
        case ' ':
          event.preventDefault();
          togglePlay();
          break;
        case 'ArrowLeft':
          event.preventDefault();
          seek(currentTime - 5);
          break;
        case 'ArrowRight':
          event.preventDefault();
          seek(currentTime + 5);
          break;
        case 'm':
          toggleMute();
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentTime, muted, isPlaying, duration]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Spinner size="lg" text="Loading review..." />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 border-b border-surface-200 bg-white px-4 py-2 dark:border-surface-800 dark:bg-surface-900">
        <button
          onClick={() => navigate(-1)}
          className="text-surface-500 hover:text-surface-700 dark:hover:text-surface-300"
        >
          <ArrowLeft size={18} />
        </button>

        <div className="min-w-0 flex-1">
          <h2 className="truncate text-sm font-semibold text-surface-900 dark:text-surface-100">
            {asset?.name || 'Review'}
          </h2>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCommentMode((current) => !current)}
          className={clsx(commentMode && 'bg-brand-50 text-brand-600 dark:bg-brand-900/20 dark:text-brand-400')}
          leftIcon={MessageSquare}
        >
          {commentMode ? 'Cancel marker' : 'Add marker'}
        </Button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="relative flex flex-1 items-center justify-center bg-black">
            {videoUrl ? (
              <video
                ref={videoRef}
                src={videoUrl}
                className="max-h-full max-w-full"
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                onEnded={() => setIsPlaying(false)}
                onClick={togglePlay}
                playsInline
              />
            ) : (
              <div className="flex flex-col items-center gap-3 text-surface-400">
                <Film size={48} />
                <p className="text-sm">Preview not available yet</p>
              </div>
            )}

            {!isPlaying && videoUrl && (
              <div
                className="absolute inset-0 flex cursor-pointer items-center justify-center"
                onClick={togglePlay}
              >
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-black/50 backdrop-blur-sm transition-transform hover:scale-110">
                  <Play size={28} className="ml-1 text-white" />
                </div>
              </div>
            )}
          </div>

          <div className="bg-surface-900 px-4 py-2">
            <div
              ref={timelineRef}
              className={clsx('group relative flex h-8 cursor-pointer items-center', commentMode && 'bg-brand-900/30')}
              onClick={handleTimelineClick}
            >
              <div className="absolute inset-x-0 top-1/2 h-0.5 -translate-y-1/2 rounded-full bg-surface-700">
                <div
                  className="h-full rounded-full bg-brand-500 transition-[width] duration-100"
                  style={{ width: duration ? `${(currentTime / duration) * 100}%` : '0%' }}
                />
              </div>

              {showThreads && orderedThreads.map((thread) => (
                <div
                  key={thread.id}
                  className={clsx(
                    'absolute top-1/2 z-10 h-2.5 w-2.5 -translate-y-1/2 rounded-full transition-transform hover:scale-150',
                    thread.resolved
                      ? 'bg-surface-500'
                      : activeThread?.id === thread.id
                        ? 'bg-brand-400 ring-2 ring-brand-300'
                        : 'bg-amber-500'
                  )}
                  style={{ left: `${duration ? (thread.timecode / duration) * 100 : 0}%` }}
                  onClick={(event) => {
                    event.stopPropagation();
                    handleThreadClick(thread);
                  }}
                  title={`${formatDuration(thread.timecode || 0)} - ${thread.content || 'Comment thread'}`}
                />
              ))}

              <div
                className="pointer-events-none absolute top-1/2 z-10 h-5 w-3 -translate-y-1/2 rounded-sm bg-white shadow-md"
                style={{ left: duration ? `calc(${(currentTime / duration) * 100}% - 6px)` : '0%' }}
              />
            </div>

            <div className="mt-1 flex items-center gap-2">
              <button onClick={() => seek(0)} className="p-1 text-surface-400 hover:text-white">
                <SkipBack size={14} />
              </button>
              <button onClick={togglePlay} className="p-1 text-white">
                {isPlaying ? <Pause size={18} /> : <Play size={18} />}
              </button>
              <button onClick={() => seek(duration)} className="p-1 text-surface-400 hover:text-white">
                <SkipForward size={14} />
              </button>

              <span className="ml-1 font-mono text-xs tabular-nums text-surface-400">
                {formatDuration(currentTime)} / {formatDuration(duration)}
              </span>

              <div className="ml-auto flex items-center gap-2">
                <select
                  value={playbackRate}
                  onChange={(event) => changePlaybackRate(parseFloat(event.target.value))}
                  className="h-6 cursor-pointer rounded bg-transparent px-1 text-xs text-surface-400"
                >
                  <option value="0.5">0.5x</option>
                  <option value="0.75">0.75x</option>
                  <option value="1">1x</option>
                  <option value="1.25">1.25x</option>
                  <option value="1.5">1.5x</option>
                  <option value="2">2x</option>
                </select>

                <div className="flex items-center gap-1.5">
                  <button onClick={toggleMute} className="p-1 text-surface-400 hover:text-white">
                    {muted || volume === 0 ? <VolumeX size={16} /> : <Volume2 size={16} />}
                  </button>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={muted ? 0 : volume}
                    onChange={changeVolume}
                    className="h-1 w-16 accent-brand-500"
                  />
                </div>

                <button
                  onClick={() => videoRef.current?.requestFullscreen?.()}
                  className="p-1 text-surface-400 hover:text-white"
                >
                  <Maximize size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="flex w-80 flex-shrink-0 flex-col border-l border-surface-200 bg-white dark:border-surface-800 dark:bg-surface-900">
          <div className="flex items-center justify-between border-b border-surface-200 px-4 py-3 dark:border-surface-800">
            <h3 className="text-sm font-semibold text-surface-900 dark:text-surface-100">
              Comments
              <span className="ml-1.5 text-xs font-normal text-surface-400">
                ({orderedThreads.filter((thread) => !thread.resolved).length})
              </span>
            </h3>

            <label className="flex cursor-pointer items-center gap-1.5 text-xs text-surface-500">
              <input
                type="checkbox"
                checked={showThreads}
                onChange={(event) => setShowThreads(event.target.checked)}
                className="h-3.5 w-3.5 rounded border-surface-300 text-brand-600"
              />
              Show markers
            </label>
          </div>

          <div className="flex-1 overflow-y-auto">
            {threadsLoading ? (
              <div className="flex justify-center py-8">
                <Spinner size="sm" />
              </div>
            ) : !orderedThreads.length ? (
              <EmptyState
                icon={MessageSquare}
                title="No comments yet"
                description="Add a marker on the timeline or leave a timestamped comment."
              />
            ) : (
              <div>
                {activeThread && (
                  <div className="border-b border-surface-200 bg-brand-50/50 dark:border-surface-800 dark:bg-brand-900/10">
                    <div className="px-4 py-3">
                      <div className="mb-2 flex items-center justify-between">
                        <span className="font-mono text-xs font-medium text-brand-600 dark:text-brand-400">
                          {formatDuration(activeThread.timecode || 0)}
                        </span>

                        {activeThread.id && !activeThread.resolved && (
                          <button
                            onClick={() => resolveMutation.mutate(activeThread.id)}
                            className="flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-700 dark:text-emerald-400"
                          >
                            <Check size={12} />
                            Resolve
                          </button>
                        )}

                        {activeThread.resolved && (
                          <Badge variant="success" dot>Resolved</Badge>
                        )}
                      </div>

                      {activeThread.content && (
                        <p className="mb-2 text-sm text-surface-700 dark:text-surface-300">
                          {activeThread.content}
                        </p>
                      )}

                      {activeThread.user && (
                        <div className="flex items-center gap-1.5 text-xs text-surface-500">
                          <Avatar src={activeThread.user.avatar} name={activeThread.user.name} size="xs" />
                          {activeThread.user.name}
                        </div>
                      )}

                      {activeThread.comments?.map((comment) => (
                        <div key={comment.id} className="mt-2 border-t border-surface-200 pt-2 dark:border-surface-800">
                          <div className="flex items-start gap-2">
                            <Avatar src={comment.user?.avatar} name={comment.user?.name} size="xs" />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-medium text-surface-700 dark:text-surface-300">
                                  {comment.user?.name}
                                </span>
                              </div>
                              <p className="mt-0.5 text-sm text-surface-600 dark:text-surface-400">
                                {comment.content}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}

                      <div className="mt-2 flex items-center gap-2">
                        <input
                          type="text"
                          placeholder="Reply..."
                          value={commentText}
                          onChange={(event) => setCommentText(event.target.value)}
                          onKeyDown={(event) => event.key === 'Enter' && handleSubmitComment()}
                          className="flex-1 rounded-lg border border-surface-300 bg-white px-3 py-1.5 text-sm placeholder:text-surface-400 focus:border-brand-500 focus:outline-none dark:border-surface-700 dark:bg-surface-900 dark:text-surface-100"
                        />
                        <Button
                          size="sm"
                          onClick={handleSubmitComment}
                          disabled={!commentText.trim()}
                          loading={addCommentMutation.isPending || createThreadMutation.isPending}
                          leftIcon={Send}
                          className="h-8"
                        >
                          Send
                        </Button>
                      </div>
                    </div>

                    <button
                      onClick={() => setActiveThread(null)}
                      className="w-full border-t border-surface-200 px-4 py-1.5 text-center text-xs text-surface-500 hover:text-surface-700 dark:border-surface-800"
                    >
                      Close
                    </button>
                  </div>
                )}

                {orderedThreads.map((thread) => (
                  <div
                    key={thread.id}
                    className={clsx(
                      'cursor-pointer border-b border-surface-100 px-4 py-3 transition-colors hover:bg-surface-50 dark:border-surface-800 dark:hover:bg-surface-800/50',
                      activeThread?.id === thread.id && 'bg-brand-50/30 dark:bg-brand-900/10',
                      thread.resolved && 'opacity-60'
                    )}
                    onClick={() => handleThreadClick(thread)}
                  >
                    <div className="flex items-center gap-2">
                      <span className="flex-shrink-0 font-mono text-xs text-surface-500 dark:text-surface-400">
                        {formatDuration(thread.timecode || 0)}
                      </span>
                      <span
                        className={clsx(
                          'truncate text-sm',
                          thread.resolved
                            ? 'text-surface-400 line-through'
                            : 'text-surface-700 dark:text-surface-300'
                        )}
                      >
                        {thread.content || 'Comment thread'}
                      </span>
                    </div>

                    <div className="mt-1 flex items-center gap-2">
                      {thread.user && (
                        <div className="flex items-center gap-1 text-[10px] text-surface-400">
                          <Avatar name={thread.user.name} size="xs" />
                          {thread.user.name}
                        </div>
                      )}

                      {thread.comments?.length > 0 && (
                        <span className="flex items-center gap-0.5 text-[10px] text-surface-400">
                          <MessageSquare size={10} />
                          {thread.comments.length}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {!activeThread && (
            <div className="border-t border-surface-200 px-4 py-3 dark:border-surface-800">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder={`Add a comment at ${formatDuration(currentTime)}...`}
                  value={commentText}
                  onChange={(event) => setCommentText(event.target.value)}
                  onKeyDown={(event) => event.key === 'Enter' && handleSubmitComment()}
                  className="flex-1 rounded-lg border border-surface-300 bg-white px-3 py-1.5 text-sm placeholder:text-surface-400 focus:border-brand-500 focus:outline-none dark:border-surface-700 dark:bg-surface-900 dark:text-surface-100"
                />
                <Button
                  size="sm"
                  onClick={handleSubmitComment}
                  disabled={!commentText.trim()}
                  loading={createThreadMutation.isPending}
                  leftIcon={Send}
                  className="h-8"
                >
                  Send
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
