<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;
use App\Models\User;
use App\Models\Workspace;

class AuthTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_register(): void
    {
        $response = $this->postJson('/api/auth/register', [
            'name'                  => 'Test User',
            'email'                 => 'test@example.com',
            'password'              => 'Password123!',
            'password_confirmation' => 'Password123!',
        ]);

        $response->assertStatus(201)
            ->assertJsonStructure(['user', 'token']);
    }

    public function test_user_can_login(): void
    {
        $user = User::factory()->create([
            'email'    => 'login@example.com',
            'password' => bcrypt('Password123!'),
        ]);

        $response = $this->postJson('/api/auth/login', [
            'email'    => 'login@example.com',
            'password' => 'Password123!',
        ]);

        $response->assertStatus(200)
            ->assertJsonStructure(['user', 'token']);
    }

    public function test_user_cannot_login_with_wrong_password(): void
    {
        $user = User::factory()->create([
            'email'    => 'wrong@example.com',
            'password' => bcrypt('CorrectPassword!'),
        ]);

        $response = $this->postJson('/api/auth/login', [
            'email'    => 'wrong@example.com',
            'password' => 'WrongPassword!',
        ]);

        $response->assertStatus(422);
    }

    public function test_authenticated_user_can_get_workspaces(): void
    {
        $user = User::factory()->create();
        $workspace = Workspace::factory()->create();

        $user->workspaceMemberships()->create([
            'workspace_id' => $workspace->id,
            'role'         => 'member',
        ]);

        $response = $this->actingAs($user)
            ->getJson('/api/auth/workspaces');

        $response->assertStatus(200)
            ->assertJsonStructure(['workspaces']);
    }
}
