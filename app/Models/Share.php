<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

class Share extends Model
{
    use HasUuids;

    protected $fillable = [
        'asset_version_id', 'token', 'password_hash',
        'expires_at', 'permissions', 'is_active', 'watermark_policy', 'created_by',
    ];

    protected $casts = [
        'expires_at' => 'datetime',
        'is_active' => 'boolean',
    ];
    protected $hidden = ['password_hash'];

    public const PERMISSION_VIEW = 'view';
    public const PERMISSION_DOWNLOAD = 'download';
    public const PERMISSION_DOWNLOAD_HQ = 'download_hq';

    protected static function booted(): void
    {
        static::creating(function (Share $share) {
            if (empty($share->token)) {
                $share->token = Str::random(64);
            }
        });
    }

    public function version(): BelongsTo
    {
        return $this->belongsTo(AssetVersion::class, 'asset_version_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function visits(): HasMany
    {
        return $this->hasMany(ShareVisit::class);
    }

    public function isExpired(): bool
    {
        return $this->expires_at && $this->expires_at->isPast();
    }

    public function isActive(): bool
    {
        return $this->is_active && ! $this->isExpired();
    }
}
