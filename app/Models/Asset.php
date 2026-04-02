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

    protected $fillable = [
        'folder_id', 'current_version_id', 'name', 'mime_type',
        'size_bytes', 'sha256', 'status', 'metadata', 'tags', 'created_by',
    ];

    protected $casts = [
        'metadata' => 'array',
        'tags' => 'array',
        'size_bytes' => 'integer',
    ];

    public const STATUS_PENDING = 'pending';
    public const STATUS_PROCESSING = 'processing';
    public const STATUS_READY = 'ready';
    public const STATUS_ERROR = 'error';

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

    public function shares(): HasMany
    {
        return $this->hasMany(Share::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function isVideo(): bool
    {
        return str_starts_with($this->mime_type, 'video/');
    }

    public function isImage(): bool
    {
        return str_starts_with($this->mime_type, 'image/');
    }
}
