<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Role;
use App\Models\Permission;
use App\Models\Workspace;
use App\Models\User;
use Illuminate\Support\Facades\Hash;

class RoleSeeder extends Seeder
{
    public function run(): void
    {
        // Workspace 角色
        $roles = [
            'owner'  => 'Workspace 所有者，拥有全部权限',
            'admin'  => '管理员，可管理成员和项目',
            'member' => '成员，可上传和审片',
            'viewer' => '查看者，仅可查看和评论',
        ];

        foreach ($roles as $name => $description) {
            Role::firstOrCreate(
                ['name' => $name, 'guard_name' => 'web'],
                ['description' => $description]
            );
        }

        // 创建演示 Workspace 和管理员账户
        $workspace = Workspace::firstOrCreate(
            ['slug' => 'demo'],
            [
                'name'     => '演示空间',
                'slug'     => 'demo',
                'owner_id' => null,
            ]
        );

        $admin = User::firstOrCreate(
            ['email' => 'admin@framereview.local'],
            [
                'name'       => 'Admin',
                'email'      => 'admin@framereview.local',
                'password'   => Hash::make('admin123'),
                'email_verified_at' => now(),
            ]
        );

        $admin->workspaceMemberships()->firstOrCreate(
            ['workspace_id' => $workspace->id],
            ['role' => 'owner']
        );

        $this->command->info('Roles and demo data seeded.');
    }
}
