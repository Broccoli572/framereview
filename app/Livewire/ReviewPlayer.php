<?php

namespace App\Livewire;

use App\Models\Asset;
use App\Models\AssetVersion;
use App\Models\ReviewThread;
use App\Models\ReviewComment;
use Illuminate\Support\Facades\Auth;
use Livewire\Component;

class ReviewPlayer extends Component
{
    public Asset $asset;
    public ?AssetVersion $version = null;
    public ?string $workspaceId = null;

    // 播放器状态
    public string $currentTimecode = '00:00:00:00';
    public float $currentSeconds = 0;
    public bool $isPlaying = false;
    public float $duration = 0;

    // 时间轴线程
    public $threads = [];
    public ?int $activeThreadId = null;
    public ?int $replyToCommentId = null;

    // UI 状态
    public bool $showCommentPanel = false;
    public bool $showThreadList = false;
    public string $newCommentText = '';
    public array $newCommentMentions = [];
    public ?string $newThreadType = 'timecode';

    protected $listeners = [
        'playerTimeUpdate' => 'onPlayerTimeUpdate',
        'playerDurationLoaded' => 'onPlayerDurationLoaded',
        'playerPlay' => 'onPlayerPlay',
        'playerPause' => 'onPlayerPause',
    ];

    public function mount(int $assetId, ?string $workspaceId = null)
    {
        $this->asset = Asset::findOrFail($assetId);
        $this->workspaceId = $workspaceId;

        // 默认加载最新版本
        $this->version = $this->asset->versions()->latest()->first();
        $this->loadThreads();
    }

    public function loadThreads(): void
    {
        if (!$this->version) {
            return;
        }

        $this->threads = $this->version->threads()
            ->with(['comments' => fn($q) => $q->with('user')->orderBy('created_at')])
            ->withCount('comments')
            ->orderBy('timecode_seconds')
            ->get()
            ->append(['is_resolved'])
            ->toArray();
    }

    public function loadThreadsInRange(float $from, float $to): void
    {
        if (!$this->version) {
            return;
        }

        $this->threads = $this->version->threads()
            ->with(['comments' => fn($q) => $q->with('user')->orderBy('created_at')])
            ->whereBetween('timecode_seconds', [$from, $to])
            ->orderBy('timecode_seconds')
            ->get()
            ->append(['is_resolved'])
            ->toArray();
    }

    // ─── 播放器事件回调 ─────────────────────────────────────────────────────

    public function onPlayerTimeUpdate(array $data): void
    {
        $this->currentSeconds = $data['currentTime'];
        $this->currentTimecode = $this->formatTimecode($data['currentTime']);

        // 动态加载附近线程（±30秒窗口，每2秒更新一次）
        if ($this->version) {
            $windowSize = 30;
            $this->loadThreadsInRange(
                max(0, $this->currentSeconds - $windowSize),
                min($this->duration, $this->currentSeconds + $windowSize)
            );
        }
    }

    public function onPlayerDurationLoaded(float $duration): void
    {
        $this->duration = $duration;
    }

    public function onPlayerPlay(): void
    {
        $this->isPlaying = true;
    }

    public function onPlayerPause(): void
    {
        $this->isPlaying = false;
    }

    // ─── 时间轴交互 ─────────────────────────────────────────────────────────

    public function seekToThread(int $threadId): void
    {
        $thread = collect($this->threads)->firstWhere('id', $threadId);

        if ($thread && $thread['timecode_seconds'] !== null) {
            $this->dispatch('playerSeek', timecode: $thread['timecode_seconds']);
            $this->activeThreadId = $threadId;
            $this->showCommentPanel = true;
        }
    }

    public function jumpToTimecode(float $seconds): void
    {
        $this->dispatch('playerSeek', timecode: $seconds);
    }

    public function setActiveThread(int $threadId): void
    {
        $this->activeThreadId = $threadId;
        $this->showCommentPanel = true;
    }

    public function startNewThread(): void
    {
        $this->newThreadType = 'timecode';
        $this->newCommentText = '';
        $this->newCommentMentions = [];
        $this->replyToCommentId = null;
        $this->activeThreadId = null;
        $this->showCommentPanel = true;
    }

    public function addReply(?string $commentId = null): void
    {
        $this->replyToCommentId = $commentId;
        $this->newCommentText = '';
        $this->showCommentPanel = true;
    }

    // ─── 提交评论 ───────────────────────────────────────────────────────────

    public function submitComment(): void
    {
        if (empty(trim($this->newCommentText)) || !$this->version) {
            return;
        }

        $user = Auth::user();

        if ($this->activeThreadId) {
            // 回复现有 Thread
            $comment = ReviewComment::create([
                'thread_id'  => $this->activeThreadId,
                'user_id'    => $user->id,
                'parent_id'  => $this->replyToCommentId,
                'content'    => $this->newCommentText,
                'mentions'   => $this->newCommentMentions,
            ]);
            $comment->load('user');
        } else {
            // 新建 Thread（在当前时间点）
            $thread = ReviewThread::create([
                'asset_version_id' => $this->version->id,
                'type'             => ReviewThread::TYPE_TIMECODE,
                'timecode_seconds' => $this->currentSeconds,
                'status'           => ReviewThread::STATUS_OPEN,
            ]);

            $comment = ReviewComment::create([
                'thread_id' => $thread->id,
                'user_id'   => $user->id,
                'content'   => $this->newCommentText,
                'mentions'  => $this->newCommentMentions,
            ]);
            $comment->load('user');

            $this->activeThreadId = $thread->id;
        }

        $this->newCommentText = '';
        $this->newCommentMentions = [];
        $this->replyToCommentId = null;

        $this->loadThreads();
        $this->dispatch('refreshThreads')->self();
    }

    public function resolveThread(int $threadId): void
    {
        $thread = ReviewThread::find($threadId);
        $thread?->markResolved(Auth::id());
        $this->loadThreads();
    }

    public function reopenThread(int $threadId): void
    {
        $thread = ReviewThread::find($threadId);
        $thread?->markOpen();
        $this->loadThreads();
    }

    // ─── 辅助方法 ───────────────────────────────────────────────────────────

    private function formatTimecode(float $seconds): string
    {
        $totalSeconds = $seconds;
        $hours   = intdiv((int) $totalSeconds, 3600);
        $minutes = intdiv((int) $totalSeconds % 3600, 60);
        $secs    = intdiv((int) $totalSeconds, 1) % 60;
        $frames  = (int)(($totalSeconds - floor($totalSeconds)) * 24);

        return sprintf('%02d:%02d:%02d:%02d', $hours, $minutes, $secs, $frames);
    }

    public function getActiveThreadProperty(): ?array
    {
        if (!$this->activeThreadId) {
            return null;
        }

        return collect($this->threads)->firstWhere('id', $this->activeThreadId);
    }

    public function getOpenThreadsCountProperty(): int
    {
        return collect($this->threads)->where('status', 'open')->count();
    }

    public function render()
    {
        return view('livewire.review-player', [
            'asset'   => $this->asset,
            'version' => $this->version,
        ]);
    }
}
