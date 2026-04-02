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
}
