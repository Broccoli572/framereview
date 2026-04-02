<?php

namespace App\Services;

use App\Models\Notification;
use App\Models\ReviewComment;
use App\Models\ReviewThread;
use App\Models\User;
use Illuminate\Support\Facades\Log;

class NotificationService
{
    /**
     * 发送评论 @提及 通知
     */
    public function notifyMentionedUsers(ReviewComment $comment, array $mentionedUserIds): void
    {
        $comment->load(['thread.version.asset', 'user']);

        $actor = $comment->user;
        $thread = $comment->thread;
        $version = $thread->version;
        $asset = $version?->asset;

        foreach ($mentionedUserIds as $userId) {
            // 不通知自己
            if ($userId === $actor->id) {
                continue;
            }

            try {
                Notification::create([
                    'user_id' => $userId,
                    'type'    => Notification::TYPE_COMMENT_MENTION,
                    'title'   => "{$actor->name} 在评论中提及了你",
                    'body'    => mb_substr($comment->content, 0, 100),
                    'data'    => [
                        'comment_id'  => $comment->id,
                        'thread_id'   => $thread->id,
                        'asset_id'    => $asset?->id,
                        'asset_name'  => $asset?->name,
                        'actor_id'    => $actor->id,
                        'actor_name'  => $actor->name,
                    ],
                ]);
            } catch (\Throwable $e) {
                Log::warning('Failed to create mention notification', [
                    'comment_id' => $comment->id,
                    'user_id'    => $userId,
                    'error'      => $e->getMessage(),
                ]);
            }
        }
    }

    /**
     * 发送 Thread 被解决的通知（通知评论作者）
     */
    public function notifyThreadResolved(ReviewThread $thread, User $resolvedBy): void
    {
        $thread->load(['version.asset', 'comments']);

        $asset = $thread->version?->asset;

        // 通知所有参与评论的用户（不包含解决者自己）
        $participantUserIds = $thread->comments
            ->pluck('user_id')
            ->filter(fn($id) => $id !== $resolvedBy->id)
            ->unique();

        foreach ($participantUserIds as $userId) {
            try {
                Notification::create([
                    'user_id' => $userId,
                    'type'    => Notification::TYPE_THREAD_RESOLVED,
                    'title'   => "{$resolvedBy->name} 标记了一条评论为已解决",
                    'body'    => mb_substr($thread->comments->first()?->content ?? '', 0, 100),
                    'data'    => [
                        'thread_id'   => $thread->id,
                        'asset_id'    => $asset?->id,
                        'asset_name'  => $asset?->name,
                        'resolved_by' => $resolvedBy->id,
                        'resolved_by_name' => $resolvedBy->name,
                    ],
                ]);
            } catch (\Throwable $e) {
                Log::warning('Failed to create thread resolved notification', [
                    'thread_id' => $thread->id,
                    'user_id'   => $userId,
                    'error'     => $e->getMessage(),
                ]);
            }
        }
    }

    /**
     * 发送资产被分享的通知
     */
    public function notifyAssetShared(User $recipient, User $sharedBy, string $assetName, string $shareToken): void
    {
        Notification::create([
            'user_id' => $recipient->id,
            'type'    => Notification::TYPE_ASSET_SHARED,
            'title'   => "{$sharedBy->name} 分享了「{$assetName}」给你",
            'body'    => '点击查看共享内容',
            'data'    => [
                'share_token' => $shareToken,
                'shared_by'   => $sharedBy->id,
                'asset_name'  => $assetName,
            ],
        ]);
    }

    /**
     * 发送截止日期临近提醒
     */
    public function notifyDeadlineApproaching(User $user, string $assetName, string $threadUrl, int $daysLeft): void
    {
        Notification::create([
            'user_id' => $user->id,
            'type'    => Notification::TYPE_DEADLINE_APPROACH,
            'title'   => "审片截止日期临近",
            'body'    => "「{$assetName}」还有 {$daysLeft} 天截止",
            'data'    => [
                'asset_name' => $assetName,
                'thread_url' => $threadUrl,
                'days_left'  => $daysLeft,
            ],
        ]);
    }
}
