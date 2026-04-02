<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class ReviewThread extends Model
{
    use HasUuids, SoftDeletes;

    protected $fillable = [
        'asset_version_id', 'type', 'timecode_seconds',
        'frame_number', 'area_coordinates', 'status', 'resolved_by', 'resolved_at',
    ];

    protected $casts = [
        'timecode_seconds' => 'float',
        'frame_number' => 'integer',
        'area_coordinates' => 'array',
        'resolved_at' => 'datetime',
    ];

    public const TYPE_TIMECODE = 'timecode';
    public const TYPE_FRAME = 'frame';
    public const TYPE_AREA = 'area';

    public const STATUS_OPEN = 'open';
    public const STATUS_RESOLVED = 'resolved';
    public const STATUS_CONFIRMED = 'confirmed';

    public function version(): BelongsTo
    {
        return $this->belongsTo(AssetVersion::class, 'asset_version_id');
    }

    public function comments(): HasMany
    {
        return $this->hasMany(ReviewComment::class, 'thread_id')->where('is_deleted', false);
    }

    public function resolvedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'resolved_by');
    }

    /** 是否已解析（用于 API 响应追加） */
    public function getIsResolvedAttribute(): bool
    {
        return $this->status === self::STATUS_RESOLVED;
    }

    /** 格式化时间码为 HH:MM:SS:FF */
    public function getTimecodeFormattedAttribute(): ?string
    {
        if ($this->timecode_seconds === null) {
            return null;
        }

        $totalSeconds = (float) $this->timecode_seconds;
        $hours   = intdiv((int) $totalSeconds, 3600);
        $minutes = intdiv((int) $totalSeconds % 3600, 60);
        $seconds = intdiv((int) $totalSeconds, 1) % 60;
        $frames  = (int)(($totalSeconds - floor($totalSeconds)) * 24); // 假设 24fps

        return sprintf('%02d:%02d:%02d:%02d', $hours, $minutes, $seconds, $frames);
    }

    /** 标记为已解析 */
    public function markResolved(int $userId): void
    {
        $this->update([
            'status'      => self::STATUS_RESOLVED,
            'resolved_by' => $userId,
            'resolved_at' => now(),
        ]);
    }

    /** 重新打开 */
    public function markOpen(): void
    {
        $this->update([
            'status'      => self::STATUS_OPEN,
            'resolved_by' => null,
            'resolved_at' => null,
        ]);
    }
}
