<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;
use App\Models\Workspace;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Project>
 */
class ProjectFactory extends Factory
{
    public function definition(): array
    {
        return [
            'id'           => Str::uuid(),
            'workspace_id' => Workspace::factory(),
            'name'         => fake()->catchPhrase(),
            'description'  => fake()->sentence(),
            'status'       => 'active',
        ];
    }
}
