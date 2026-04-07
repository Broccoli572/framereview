import { useState, useRef, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Film, Play, Pause, Volume2, VolumeX, Maximize, SkipBack, SkipForward,
  MessageSquare, Clock, Lock, AlertTriangle, Share2
} from 'lucide-react';
import client from '../api/client';
import Avatar from '../components/ui/Avatar';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Spinner from '../components/ui/Spinner';
import EmptyState from '../components/ui/EmptyState';
import { formatDuration, formatDate, formatBytes, getInitials } from '../lib/utils';
import clsx from 'clsx';

export default function ShareViewPage() {
  const { token } = useParams();
  const [password, setPassword] = useState('');
  const [authenticated, setAuthenticated] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [muted, setMuted] = useState(false);
  const [activeAnnotation, setActiveAnnotation] = useState(null);
  const videoRef = useRef(null);

  // Fetch share info
  const { data: share, isLoading: shareLoading, error: shareError } = useQuery({
    queryKey: ['share', token],
    queryFn: async () => {
      const res = await client.get(`/shares/${token}`);
      return res.data?.data || res.data;
    },
    enabled: !!token,
  });

  // Authenticate if password protected
  const handlePasswordSubmit = (e) => {
    e.preventDefault();
    if (!password.trim()) {
      setPasswordError('请输入密码');
      return;
    }
    // Simulate auth - in production this would call the API
    if (share?.password && password !== share.password) {
      setPasswordError('密码错误');
      return;
    }
    setAuthenticated(true);
    setPasswordError('');
  };

  // Auto-authenticate if no password required
  useEffect(() => {
    if (share && !share.password) {
      setAuthenticated(true);
    }
  }, [share]);

  // Video handlers
  const handleTimeUpdate = () => {
    if (videoRef.current) setCurrentTime(videoRef.current.currentTime);
  };
  const handleLoadedMetadata = () => {
    if (videoRef.current) setDuration(videoRef.current.duration);
  };
  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) videoRef.current.pause();
    else videoRef.current.play();
    setIsPlaying(!isPlaying);
  };
  const seek = (time) => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = Math.max(0, Math.min(time, duration));
  };

  // Password gate
  if (shareLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Spinner size="lg" text="加载中..." />
      </div>
    );
  }

  if (shareError || !share) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <EmptyState
          icon={AlertTriangle}
          title="分享链接无效"
          description="此分享链接不存在或已过期"
        />
      </div>
    );
  }

  if (share.password && !authenticated) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] px-4">
        <div className="card p-8 max-w-sm w-full">
          <div className="text-center mb-6">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-900/30">
              <Lock size={24} className="text-amber-600 dark:text-amber-400" />
            </div>
            <h1 className="text-lg font-bold text-surface-900 dark:text-surface-100">受密码保护</h1>
            <p className="mt-1 text-sm text-surface-500">请输入密码以查看此分享</p>
          </div>
          <form onSubmit={handlePasswordSubmit} className="space-y-3">
            <Input
              type="password"
              placeholder="输入密码"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={passwordError}
              autoFocus
            />
            <Button type="submit" fullWidth>
              验证
            </Button>
          </form>
        </div>
      </div>
    );
  }

  const asset = share.asset || {};
  const videoUrl = asset.url || asset.file_url || share.video_url;
  const permissions = share.permissions || 'view';
  const isExpired = share.expires_at && new Date(share.expires_at) < new Date();
  const annotations = share.annotations || asset.annotations || [];

  return (
    <div className="min-h-screen bg-surface-950">
      {/* Expiry notice */}
      {isExpired && (
        <div className="flex items-center justify-center gap-2 bg-amber-500 px-4 py-2 text-sm text-white">
          <AlertTriangle size={16} />
          此分享链接已过期
        </div>
      )}

      <div className="flex flex-col lg:flex-row min-h-[calc(100vh-49px)]">
        {/* Video area */}
        <div className="flex-1 flex flex-col">
          {/* Video */}
          <div className="relative flex-1 bg-black flex items-center justify-center min-h-[300px] lg:min-h-0">
            {videoUrl ? (
              <video
                ref={videoRef}
                src={videoUrl}
                className="max-h-full max-w-full"
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                onClick={togglePlay}
                controls={false}
                playsInline
              />
            ) : (
              <div className="flex flex-col items-center gap-3 text-surface-500">
                <Film size={48} />
                <p className="text-sm">视频暂不可用</p>
              </div>
            )}
            {!isPlaying && videoUrl && (
              <div className="absolute inset-0 flex items-center justify-center cursor-pointer" onClick={togglePlay}>
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-black/50 backdrop-blur-sm hover:scale-110 transition-transform">
                  <Play size={28} className="text-white ml-1" />
                </div>
              </div>
            )}
          </div>

          {/* Controls */}
          {videoUrl && (
            <div className="bg-surface-900 px-4 py-2">
              <div
                className="relative h-1.5 bg-surface-700 rounded-full cursor-pointer mb-1"
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const pct = (e.clientX - rect.left) / rect.width;
                  seek(pct * duration);
                }}
              >
                <div
                  className="h-full bg-brand-500 rounded-full"
                  style={{ width: duration ? `${(currentTime / duration) * 100}%` : '0%' }}
                />
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => seek(0)} className="text-surface-400 hover:text-white p-1">
                  <SkipBack size={14} />
                </button>
                <button onClick={togglePlay} className="text-white p-1">
                  {isPlaying ? <Pause size={18} /> : <Play size={18} />}
                </button>
                <span className="font-mono text-xs text-surface-400 tabular-nums ml-1">
                  {formatDuration(currentTime)} / {formatDuration(duration)}
                </span>
                <div className="ml-auto flex items-center gap-2">
                  <button onClick={() => { setMuted(!muted); if (videoRef.current) videoRef.current.muted = !muted; }} className="text-surface-400 hover:text-white p-1">
                    {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                  </button>
                  <button onClick={() => videoRef.current?.requestFullscreen?.()} className="text-surface-400 hover:text-white p-1">
                    <Maximize size={16} />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Asset info */}
          <div className="bg-surface-900 border-t border-surface-800 px-6 py-4">
            <h1 className="text-lg font-semibold text-white">{asset.name || share.title || '分享视频'}</h1>
            <div className="mt-1 flex items-center gap-4 text-sm text-surface-400">
              {asset.duration && <span>{formatDuration(asset.duration)}</span>}
              {asset.size && <span>{formatBytes(asset.size)}</span>}
              {share.created_at && <span>分享于 {formatDate(share.created_at, 'yyyy-MM-dd')}</span>}
            </div>
            {share.description && (
              <p className="mt-2 text-sm text-surface-400">{share.description}</p>
            )}
          </div>
        </div>

        {/* Annotations panel */}
        <div className="w-full lg:w-80 flex-shrink-0 bg-surface-900 border-t lg:border-t-0 lg:border-l border-surface-800">
          <div className="px-4 py-3 border-b border-surface-800">
            <h3 className="text-sm font-semibold text-surface-200">
              标注 ({annotations.length})
            </h3>
          </div>
          <div className="overflow-y-auto max-h-[40vh] lg:max-h-none">
            {!annotations.length ? (
              <div className="px-4 py-8 text-center text-sm text-surface-500">
                暂无标注
              </div>
            ) : (
              annotations
                .filter((a) => !a.resolved)
                .sort((a, b) => a.timecode - b.timecode)
                .map((annotation) => (
                  <div
                    key={annotation.id}
                    className={clsx(
                      'px-4 py-3 border-b border-surface-800 cursor-pointer transition-colors',
                      activeAnnotation?.id === annotation.id
                        ? 'bg-surface-800'
                        : 'hover:bg-surface-800/50'
                    )}
                    onClick={() => {
                      setActiveAnnotation(annotation);
                      if (annotation.timecode != null) seek(annotation.timecode);
                    }}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-xs text-brand-400">{formatDuration(annotation.timecode)}</span>
                      {annotation.user && (
                        <span className="text-xs text-surface-400">{annotation.user.name}</span>
                      )}
                    </div>
                    {annotation.content && (
                      <p className="text-sm text-surface-300">{annotation.content}</p>
                    )}
                    {annotation.comments?.length > 0 && (
                      <div className="mt-2 space-y-2">
                        {annotation.comments.map((comment) => (
                          <div key={comment.id} className="flex items-start gap-2 pl-2 border-l border-surface-700">
                            <div className="flex-1">
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-medium text-surface-400">{comment.user?.name}</span>
                              </div>
                              <p className="text-xs text-surface-500 mt-0.5">{comment.content}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}


