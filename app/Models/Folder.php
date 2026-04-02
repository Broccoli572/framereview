<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Folder extends Model
{
    use HasUuids, SoftDeletes;

    protected $fillable = ['project_id', 'parent_id', 'name', 'sort_order', 'created_by'];

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function parent(): BelongsTo
    {
        return $this->belongsTo(Folder::class, 'parent_id');
    }

    public function children(): HasMany
    {
        return $this->hasMany(Folder::class, 'parent_id')->orderBy('sort_order');
    }

    public function assets(): HasMany
    {
        return $this->hasMany(Asset::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * 递归获取所有后代文件夹
     */
    public function allDescendants(): HasMany
    {
        return $this->children()->with('allDescendants');
    }

    /**
     * 获取完整面包屑路径（从根到当前）
     */
    public function breadcrumbs(): array
    {
        $path = [$this];
        $current = $this;

        while ($current->parent) {
            $current = $current->parent;
            array_unshift($path, $current);
        }

        return $path;
    }
}
