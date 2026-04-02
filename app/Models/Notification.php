<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Notification extends Model
{
    use HasUuids;

    protected $fillable = [
        'user_id', 'type', 'title', 'body', 'data', 'read_at',
    ];

    protected $casts = [
        'data'    => 'array',
        'read_at' => 'datetime',
    ];

    public const TYPE_COMMENT_MENTION   = 'comment_mention';
    public const TYPE_THREAD_RESOLVED   = 'thread_resolved';
    public const TYPE_THREAD_CONFIRMED  = 'thread_confirmed';
    public const TYPE_ASSET_SHARED      = 'asset_shared';
    public const TYPE_INVITATION         = 'invitation';
    public const TYPE_DEADLINE_APPROACH = 'deadline_approach';

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /** 标记为已读 */
    public function markAsRead(): void
    {
        if (!$this->read_at) {
            $this->update(['read_at' => now()]);
        }
    }

    /** 判是否为未读 */
    public function getIsUnreadAttribute(): bool
    {
        return $this->read_at === null;
    }
}
