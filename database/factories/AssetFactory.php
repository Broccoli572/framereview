<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;
use App\Models\Project;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Asset>
 */
class AssetFactory extends Factory
{
    public function definition(): array
    {
        return [
            'id'           => Str::uuid(),
            'project_id'   => Project::factory(),
            'folder_id'    => null,
            'name'         => fake()->filePath(),
            'original_name'=> fake()->name() . '.mp4',
            'mime_type'    => 'video/mp4',
            'size'         => fake()->numberBetween(1_000_000, 500_000_000),
            'type'         => 'video',
            'status'       => 'ready',
            'storage_path' => 'projects/' . Str::uuid() . '/original.mp4',
            'width'        => 1920,
            'height'       => 1080,
            'duration'     => fake()->randomFloat(3, 10, 3600),
        ];
    }

    public function processing(): static
    {
        return $this->state(fn (array $attr) => ['status' => 'processing']);
    }

    public function error(): static
    {
        return $this->state(fn (array $attr) => ['status' => 'error']);
    }
}
