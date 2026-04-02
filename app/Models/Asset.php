<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;

class Asset extends Model
{
    use HasUuids, SoftDeletes;

    // 资产类型
    public const TYPE_VIDEO    = 'video';
    public const TYPE_AUDIO    = 'audio';
    public const TYPE_IMAGE    = 'image';
    public const TYPE_DOCUMENT = 'document';
    public const TYPE_ARCHIVE  = 'archive';

    // 处理状态
    public const STATUS_PENDING    = 'pending';
    public const STATUS_UPLOADING  = 'uploading';
    public const STATUS_PROCESSING  = 'processing';
    public const STATUS_READY       = 'ready';
    public const STATUS_ERROR       = 'error';

    protected $fillable = [
        'project_id', 'folder_id', 'current_version_id',
        'name', 'original_name', 'mime_type', 'size_bytes', 'sha256',
        'type', 'status', 'storage_path',
        'width', 'height', 'duration', 'frame_rate',
        'metadata', 'tags', 'created_by',
    ];

    protected $casts = [
        'metadata'    => 'array',
        'tags'        => 'array',
        'size_bytes'  => 'integer',
        'width'       => 'integer',
        'height'      => 'integer',
        'duration'    => 'float',
        'frame_rate'  => 'float',
    ];

    // ─── 辅助方法 ───────────────────────────────────────────────

    public static function inferType(string $mimeType): string
    {
        return match (true) {
            str_starts_with($mimeType, 'video/') => self::TYPE_VIDEO,
            str_starts_with($mimeType, 'audio/') => self::TYPE_AUDIO,
            str_starts_with($mimeType, 'image/') => self::TYPE_IMAGE,
            str_starts_with($mimeType, 'application/pdf'),
            str_starts_with($mimeType, 'text/')  => self::TYPE_DOCUMENT,
            default => self::TYPE_ARCHIVE,
        };
    }

    public function markProcessing(): void
    {
        $this->update(['status' => self::STATUS_PROCESSING]);
    }

    public function markReady(array $metadata = []): void
    {
        $this->update(array_merge(['status' => self::STATUS_READY], $metadata));
    }

    public function markError(): void
    {
        $this->update(['status' => self::STATUS_ERROR]);
    }

    public function isVideo(): bool
    {
        return $this->type === self::TYPE_VIDEO;
    }

    public function isImage(): bool
    {
        return $this->type === self::TYPE_IMAGE;
    }

    public function isAudio(): bool
    {
        return $this->type === self::TYPE_AUDIO;
    }

    public function isReady(): bool
    {
        return $this->status === self::STATUS_READY;
    }

    // ─── 关联 ────────────────────────────────────────────────────

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function folder(): BelongsTo
    {
        return $this->belongsTo(Folder::class);
    }

    public function versions(): HasMany
    {
        return $this->hasMany(AssetVersion::class)->orderBy('version_number', 'desc');
    }

    public function currentVersion(): BelongsTo
    {
        return $this->belongsTo(AssetVersion::class, 'current_version_id');
    }

    public function latestVersion(): HasOne
    {
        return $this->hasOne(AssetVersion::class)->latestOfMany('version_number');
    }

    public function previews(): HasMany
    {
        return $this->hasMany(AssetPreview::class);
    }

    public function reviewThreads(): HasMany
    {
        return $this->hasMany(ReviewThread::class);
    }

    public function shares(): HasMany
    {
        return $this->hasMany(Share::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
