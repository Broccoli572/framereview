<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ShareVisit extends Model
{
    use HasUuids;

    protected $fillable = [
        'share_id', 'ip_address', 'user_agent', 'access_granted', 'failure_reason', 'visited_at',
    ];

    protected $casts = ['visited_at' => 'datetime', 'access_granted' => 'boolean'];

    public function share(): BelongsTo
    {
        return $this->belongsTo(Share::class);
    }
}
