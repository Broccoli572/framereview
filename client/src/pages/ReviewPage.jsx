import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Play, Pause, Volume2, VolumeX, Maximize, SkipBack, SkipForward,
  MessageSquare, ChevronRight, Clock, Film, FileText, Download, Trash2,
  Send, Check, ChevronDown, ArrowLeft, Layers, Info, Share2
} from 'lucide-react';
import client from '../api/client';
import Avatar from '../components/ui/Avatar';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Spinner from '../components/ui/Spinner';
import EmptyState from '../components/ui/EmptyState';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import { formatBytes, formatDuration, formatDate, getInitials } from '../lib/utils';
import clsx from 'clsx';

export default function ReviewPage() {
  const { assetId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Video player state
  const videoRef = useRef(null);
  const timelineRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [showAnnotations, setShowAnnotations] = useState(true);

  // Comments
  const [commentText, setCommentText] = useState('');
  const [activeAnnotation, setActiveAnnotation] = useState(null);
  const [selectedVersion, setSelectedVersion] = useState(null);
  const [commentMode, setCommentMode] = useState(false); // true = clicking timeline adds annotation

  // Fetch asset data
  const { data: asset, isLoading } = useQuery({
    queryKey: ['asset', assetId],
    queryFn: async () => {
      const res = await client.get(`/assets/${assetId}`);
      return res.data?.data || res.data;
    },
    enabled: !!assetId,
  });

  // Fetch versions
  const { data: versions } = useQuery({
    queryKey: ['asset-versions', assetId],
    queryFn: async () => {
      const res = await client.get(`/assets/${assetId}/versions`);
      return res.data?.data || res.data || [];
    },
    enabled: !!assetId,
  });

  // Fetch annotations/comments
  const { data: annotations, isLoading: annotationsLoading } = useQuery({
    queryKey: ['asset-annotations', assetId],
    queryFn: async () => {
      const res = await client.get(`/assets/${assetId}/annotations`);
      return res.data?.data || res.data || [];
    },
    enabled: !!assetId,
  });

  // Post comment mutation
  const addCommentMutation = useMutation({
    mutationFn: ({ annotationId, content, timecode }) =>
      client.post(`/assets/${assetId}/annotations/${annotationId || ''}/comments`, {
        content,
        timecode: timecode || Math.round(currentTime * 100) / 100,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['asset-annotations', assetId] });
      setCommentText('');
    },
  });

  // Create annotation mutation
  const createAnnotationMutation = useMutation({
    mutationFn: ({ timecode, content }) =>
      client.post(`/assets/${assetId}/annotations`, {
        timecode: Math.round(timecode * 100) / 100,
        content,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['asset-annotations', assetId] });
      setCommentText('');
      setCommentMode(false);
    },
  });

  // Resolve annotation
  const resolveMutation = useMutation({
    mutationFn: (annotationId) =>
      client.patch(`/assets/${assetId}/annotations/${annotationId}`, { resolved: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['asset-annotations', assetId] });
    },
  });

  // Video event handlers
  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  };

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const seek = (time) => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = Math.max(0, Math.min(time, duration));
    setCurrentTime(videoRef.current.currentTime);
  };

  const handleTimelineClick = (e) => {
    if (!timelineRef.current || !duration) return;
    const rect = timelineRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const pct = Math.max(0, Math.min(1, x / rect.width));
    seek(pct * duration);

    if (commentMode) {
      const timecode = pct * duration;
      setActiveAnnotation({ timecode, isNew: true });
      setCommentMode(false);
    }
  };

  const handleAnnotationClick = (annotation) => {
    setActiveAnnotation(annotation);
    if (annotation.timecode != null) {
      seek(annotation.timecode);
    }
  };

  const handleSubmitComment = () => {
    if (!commentText.trim()) return;
    if (activeAnnotation?.isNew) {
      createAnnotationMutation.mutate({
        timecode: activeAnnotation.timecode,
        content: commentText.trim(),
      });
    } else if (activeAnnotation?.id) {
      addCommentMutation.mutate({
        annotationId: activeAnnotation.id,
        content: commentText.trim(),
        timecode: activeAnnotation.timecode,
      });
    } else {
      // General comment at current time
      createAnnotationMutation.mutate({
        timecode: currentTime,
        content: commentText.trim(),
      });
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !muted;
      setMuted(!muted);
    }
  };

  const changeVolume = (e) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (videoRef.current) {
      videoRef.current.volume = val;
      if (val === 0) setMuted(true);
      else setMuted(false);
    }
  };

  const changePlaybackRate = (rate) => {
    setPlaybackRate(rate);
    if (videoRef.current) {
      videoRef.current.playbackRate = rate;
    }
  };

  const handleFullscreen = () => {
    if (videoRef.current) {
      if (videoRef.current.requestFullscreen) videoRef.current.requestFullscreen();
    }
  };

  const handleKeyDown = (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    switch (e.key) {
      case ' ':
        e.preventDefault();
        togglePlay();
        break;
      case 'ArrowLeft':
        e.preventDefault();
        seek(currentTime - 5);
        break;
      case 'ArrowRight':
        e.preventDefault();
        seek(currentTime + 5);
        break;
      case 'm':
        toggleMute();
        break;
    }
  };

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, currentTime, muted]);

  if (isLoading) {
    return <div className="flex items-center justify-center h-screen"><Spinner size="lg" text="加载中..." /></div>;
  }

  const currentVersion = selectedVersion || versions?.[0] || asset;
  const videoUrl = currentVersion?.url || currentVersion?.file_url || asset?.url || asset?.file_url;

  return (
    <div className="flex h-full flex-col">
      {/* Top bar */}
      <div className="flex items-center gap-3 border-b border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-900 px-4 py-2">
        <button onClick={() => navigate(-1)} className="text-surface-500 hover:text-surface-700 dark:hover:text-surface-300">
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-semibold text-surface-900 dark:text-surface-100 truncate">
            {asset?.name || '审阅'}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          {asset?.project && (
            <Badge variant="default">{asset.project.name}</Badge>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCommentMode(!commentMode)}
            className={clsx(commentMode && 'bg-brand-50 text-brand-600 dark:bg-brand-900/20 dark:text-brand-400')}
            leftIcon={MessageSquare}
          >
            {commentMode ? '取消标注' : '添加标注'}
          </Button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Main content area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Video player */}
          <div className="relative flex-1 bg-black flex items-center justify-center min-h-0">
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
                <p className="text-sm">视频暂不可用</p>
              </div>
            )}

            {/* Big play button overlay */}
            {!isPlaying && videoUrl && (
              <div
                className="absolute inset-0 flex items-center justify-center cursor-pointer"
                onClick={togglePlay}
              >
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-black/50 backdrop-blur-sm transition-transform hover:scale-110">
                  <Play size={28} className="text-white ml-1" />
                </div>
              </div>
            )}
          </div>

          {/* Controls */}
          <div className="bg-surface-900 px-4 py-2">
            {/* Timeline */}
            <div
              ref={timelineRef}
              className={clsx(
                'relative h-8 flex items-center cursor-pointer group',
                commentMode && 'bg-brand-900/30'
              )}
              onClick={handleTimelineClick}
            >
              {/* Progress bar */}
              <div className="absolute inset-x-0 top-1/2 h-0.5 -translate-y-1/2 bg-surface-700 rounded-full">
                <div
                  className="h-full bg-brand-500 rounded-full transition-[width] duration-100"
                  style={{ width: duration ? `${(currentTime / duration) * 100}%` : '0%' }}
                />
              </div>

              {/* Annotation markers */}
              {showAnnotations && annotations?.map((a) => (
                <div
                  key={a.id}
                  className={clsx(
                    'absolute top-1/2 -translate-y-1/2 z-10 w-2.5 h-2.5 rounded-full cursor-pointer transition-transform hover:scale-150',
                    a.resolved
                      ? 'bg-surface-500'
                      : activeAnnotation?.id === a.id
                        ? 'bg-brand-400 ring-2 ring-brand-300'
                        : 'bg-amber-500'
                  )}
                  style={{ left: `${(a.timecode / duration) * 100}%` }}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAnnotationClick(a);
                  }}
                  title={`${formatDuration(a.timecode)} - ${a.content || '标注'}`}
                />
              ))}

              {/* Playhead */}
              <div
                className="absolute top-1/2 -translate-y-1/2 z-10 w-3 h-5 bg-white rounded-sm shadow-md pointer-events-none"
                style={{ left: duration ? `calc(${(currentTime / duration) * 100}% - 6px)` : '0%' }}
              />
            </div>

            {/* Control buttons */}
            <div className="flex items-center gap-2 mt-1">
              <button onClick={() => seek(0)} className="text-surface-400 hover:text-white p-1">
                <SkipBack size={14} />
              </button>
              <button onClick={togglePlay} className="text-white p-1">
                {isPlaying ? <Pause size={18} /> : <Play size={18} />}
              </button>
              <button onClick={() => seek(duration)} className="text-surface-400 hover:text-white p-1">
                <SkipForward size={14} />
              </button>

              <span className="font-mono text-xs text-surface-400 tabular-nums ml-1">
                {formatDuration(currentTime)} / {formatDuration(duration)}
              </span>

              <div className="ml-auto flex items-center gap-2">
                {/* Playback rate */}
                <select
                  value={playbackRate}
                  onChange={(e) => changePlaybackRate(parseFloat(e.target.value))}
                  className="h-6 rounded bg-transparent text-xs text-surface-400 px-1 cursor-pointer"
                >
                  <option value="0.5">0.5x</option>
                  <option value="0.75">0.75x</option>
                  <option value="1">1x</option>
                  <option value="1.25">1.25x</option>
                  <option value="1.5">1.5x</option>
                  <option value="2">2x</option>
                </select>

                {/* Volume */}
                <div className="flex items-center gap-1.5">
                  <button onClick={toggleMute} className="text-surface-400 hover:text-white p-1">
                    {muted || volume === 0 ? <VolumeX size={16} /> : <Volume2 size={16} />}
                  </button>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={muted ? 0 : volume}
                    onChange={changeVolume}
                    className="w-16 h-1 accent-brand-500"
                  />
                </div>

                <button onClick={handleFullscreen} className="text-surface-400 hover:text-white p-1">
                  <Maximize size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right panel - Annotations & Comments */}
        <div className="w-80 flex-shrink-0 border-l border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-900 flex flex-col">
          {/* Panel header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-surface-200 dark:border-surface-800">
            <h3 className="text-sm font-semibold text-surface-900 dark:text-surface-100">
              标注与评论
              {annotations && (
                <span className="ml-1.5 text-xs font-normal text-surface-400">
                  ({annotations.filter((a) => !a.resolved).length})
                </span>
              )}
            </h3>
            <label className="flex items-center gap-1.5 text-xs text-surface-500 cursor-pointer">
              <input
                type="checkbox"
                checked={showAnnotations}
                onChange={(e) => setShowAnnotations(e.target.checked)}
                className="h-3.5 w-3.5 rounded border-surface-300 text-brand-600"
              />
              显示标注
            </label>
          </div>

          {/* Annotations list */}
          <div className="flex-1 overflow-y-auto">
            {annotationsLoading ? (
              <div className="flex justify-center py-8"><Spinner size="sm" /></div>
            ) : !annotations?.length ? (
              <EmptyState
                icon={MessageSquare}
                title="暂无标注"
                description="点击「添加标注」按钮，在时间轴上点击即可创建标注"
              />
            ) : (
              <div>
                {/* Active annotation / comment thread */}
                {activeAnnotation && (
                  <div className="border-b border-surface-200 dark:border-surface-800 bg-brand-50/50 dark:bg-brand-900/10">
                    <div className="px-4 py-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-mono text-xs text-brand-600 dark:text-brand-400 font-medium">
                          {formatDuration(activeAnnotation.timecode)}
                        </span>
                        {activeAnnotation.id && !activeAnnotation.resolved && (
                          <button
                            onClick={() => resolveMutation.mutate(activeAnnotation.id)}
                            className="flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-700 dark:text-emerald-400"
                          >
                            <Check size={12} />
                            已解决
                          </button>
                        )}
                        {activeAnnotation.resolved && (
                          <Badge variant="success" dot>已解决</Badge>
                        )}
                      </div>
                      {activeAnnotation.content && (
                        <p className="text-sm text-surface-700 dark:text-surface-300 mb-2">
                          {activeAnnotation.content}
                        </p>
                      )}
                      {activeAnnotation.user && (
                        <div className="flex items-center gap-1.5 text-xs text-surface-500">
                          <Avatar src={activeAnnotation.user.avatar} name={activeAnnotation.user.name} size="xs" />
                          {activeAnnotation.user.name}
                          {activeAnnotation.created_at && ` · ${formatRelativeTime(activeAnnotation.created_at)}`}
                        </div>
                      )}

                      {/* Comments in thread */}
                      {activeAnnotation.comments?.map((comment) => (
                        <div key={comment.id} className="mt-2 pt-2 border-t border-surface-200 dark:border-surface-800">
                          <div className="flex items-start gap-2">
                            <Avatar src={comment.user?.avatar} name={comment.user?.name} size="xs" />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-medium text-surface-700 dark:text-surface-300">
                                  {comment.user?.name}
                                </span>
                                {comment.created_at && (
                                  <span className="text-[10px] text-surface-400">{formatRelativeTime(comment.created_at)}</span>
                                )}
                              </div>
                              <p className="text-sm text-surface-600 dark:text-surface-400 mt-0.5">{comment.content}</p>
                            </div>
                          </div>
                        </div>
                      ))}

                      {/* Reply input */}
                      <div className="mt-2 flex items-center gap-2">
                        <input
                          type="text"
                          placeholder="回复..."
                          value={commentText}
                          onChange={(e) => setCommentText(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleSubmitComment()}
                          className="flex-1 rounded-lg border border-surface-300 bg-white px-3 py-1.5 text-sm dark:border-surface-700 dark:bg-surface-900 dark:text-surface-100 placeholder:text-surface-400 focus:border-brand-500 focus:outline-none"
                        />
                        <Button
                          size="sm"
                          onClick={handleSubmitComment}
                          disabled={!commentText.trim()}
                          loading={addCommentMutation.isPending || createAnnotationMutation.isPending}
                          leftIcon={Send}
                          className="h-8"
                        >
                          发送
                        </Button>
                      </div>
                    </div>
                    <button
                      onClick={() => setActiveAnnotation(null)}
                      className="w-full px-4 py-1.5 text-xs text-surface-500 hover:text-surface-700 text-center border-t border-surface-200 dark:border-surface-800"
                    >
                      收起
                    </button>
                  </div>
                )}

                {/* Annotation list */}
                {annotations
                  .sort((a, b) => a.timecode - b.timecode)
                  .map((annotation) => (
                    <div
                      key={annotation.id}
                      className={clsx(
                        'px-4 py-3 border-b border-surface-100 dark:border-surface-800 cursor-pointer transition-colors hover:bg-surface-50 dark:hover:bg-surface-800/50',
                        activeAnnotation?.id === annotation.id && 'bg-brand-50/30 dark:bg-brand-900/10',
                        annotation.resolved && 'opacity-60'
                      )}
                      onClick={() => handleAnnotationClick(annotation)}
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-surface-500 dark:text-surface-400 flex-shrink-0">
                          {formatDuration(annotation.timecode)}
                        </span>
                        <span className={clsx(
                          'text-sm truncate',
                          annotation.resolved
                            ? 'text-surface-400 line-through'
                            : 'text-surface-700 dark:text-surface-300'
                        )}>
                          {annotation.content || '标注'}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center gap-2">
                        {annotation.user && (
                          <div className="flex items-center gap-1 text-[10px] text-surface-400">
                            <Avatar name={annotation.user.name} size="xs" />
                            {annotation.user.name}
                          </div>
                        )}
                        {annotation.comments?.length > 0 && (
                          <span className="flex items-center gap-0.5 text-[10px] text-surface-400">
                            <MessageSquare size={10} />
                            {annotation.comments.length}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>

          {/* New comment input at bottom */}
          {!activeAnnotation && (
            <div className="border-t border-surface-200 dark:border-surface-800 px-4 py-3">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder={`在 ${formatDuration(currentTime)} 添加评论...`}
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSubmitComment()}
                  className="flex-1 rounded-lg border border-surface-300 bg-white px-3 py-1.5 text-sm dark:border-surface-700 dark:bg-surface-900 dark:text-surface-100 placeholder:text-surface-400 focus:border-brand-500 focus:outline-none"
                />
                <Button
                  size="sm"
                  onClick={handleSubmitComment}
                  disabled={!commentText.trim()}
                  loading={createAnnotationMutation.isPending}
                  leftIcon={Send}
                  className="h-8"
                >
                  发送
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function formatRelativeTime(date) {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = now - d;
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return '刚刚';
  if (diffMins < 60) return `${diffMins} 分钟前`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours} 小时前`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays} 天前`;
  return d.toLocaleDateString('zh-CN');
}
