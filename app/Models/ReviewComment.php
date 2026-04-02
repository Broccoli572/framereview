<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ReviewComment extends Model
{
    use HasUuids;

    protected $fillable = ['thread_id', 'user_id', 'parent_id', 'content', 'mentions', 'is_deleted'];

    protected $casts = ['mentions' => 'array', 'is_deleted' => 'boolean'];

    public function thread(): BelongsTo
    {
        return $this->belongsTo(ReviewThread::class, 'thread_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function parent(): BelongsTo
    {
        return $this->belongsTo(ReviewComment::class, 'parent_id');
    }
}
