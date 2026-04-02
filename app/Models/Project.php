<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Project extends Model
{
    use HasUuids, SoftDeletes;

    protected $fillable = ['workspace_id', 'name', 'description', 'cover', 'status', 'quota_bytes'];

    public function workspace(): BelongsTo
    {
        return $this->belongsTo(Workspace::class);
    }

    public function members(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'project_member')
            ->withPivot('role_id')
            ->withTimestamps();
    }

    public function folders(): HasMany
    {
        return $this->hasMany(Folder::class);
    }

    public function rootFolders()
    {
        return $this->folders()->whereNull('parent_id');
    }
}
