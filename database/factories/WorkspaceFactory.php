<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Workspace>
 */
class WorkspaceFactory extends Factory
{
    public function definition(): array
    {
        $name = fake()->company();
        return [
            'id'       => Str::uuid(),
            'name'     => $name,
            'slug'     => Str::slug($name) . '-' . Str::random(4),
            'owner_id' => null,
            'avatar_url' => fake()->imageUrl(200, 200, 'business'),
        ];
    }
}
