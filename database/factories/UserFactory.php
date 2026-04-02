<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\User>
 */
class UserFactory extends Factory
{
    public function definition(): array
    {
        return [
            'id'            => Str::uuid(),
            'name'          => fake()->name(),
            'email'         => fake()->unique()->safeEmail(),
            'password'      => Hash::make('password'),
            'avatar_url'    => fake()->imageUrl(200, 200, 'people'),
            'email_verified_at' => now(),
        ];
    }
}
