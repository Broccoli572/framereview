<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use Spatie\Permission\Traits\HasRoles;

class User extends Authenticatable
{
    use HasUuids, HasApiTokens, Notifiable, HasRoles;

    protected $fillable = ['name', 'email', 'password', 'avatar', 'is_active'];
    protected $hidden = ['password', 'remember_token'];
    protected $casts = [
        'email_verified_at' => 'datetime',
        'password' => 'hashed',
        'is_active' => 'boolean',
    ];

    public function workspaces(): BelongsToMany
    {
        return $this->belongsToMany(Workspace::class)->withPivot('role')->withTimestamps();
    }

    public function projects()
    {
        return $this->belongsToMany(Project::class, 'project_member')
            ->withPivot('role_id')
            ->withTimestamps();
    }
}
