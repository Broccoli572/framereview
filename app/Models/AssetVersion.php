<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class AssetVersion extends Model
{
    use HasUuids;

    protected $fillable = [
        'asset_id', 'version_number', 'file_path',
        'size_bytes', 'sha256', 'notes', 'uploaded_by',
    ];

    protected $casts = ['size_bytes' => 'integer', 'version_number' => 'integer'];

    public function asset(): BelongsTo
    {
        return $this->belongsTo(Asset::class);
    }

    public function preview(): HasOne
    {
        return $this->hasOne(AssetPreview::class);
    }

    public function threads(): HasMany
    {
        return $this->hasMany(ReviewThread::class);
    }

    public function shares(): HasMany
    {
        return $this->hasMany(Share::class);
    }

    public function uploader(): BelongsTo
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }

    /** 完整物理路径 */
    public function fullPath(): string
    {
        return rtrim(env('MEDIA_ROOT', '/nas/media'), '/') . '/' . ltrim($this->file_path, '/');
    }
}
