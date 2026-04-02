<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AssetPreview extends Model
{
    use HasUuids;

    protected $fillable = [
        'asset_version_id', 'poster_url', 'sprite_url',
        'waveform_url', 'proxy_url', 'hls_url', 'metadata', 'keyframes',
    ];

    protected $casts = ['metadata' => 'array', 'keyframes' => 'array'];
}
