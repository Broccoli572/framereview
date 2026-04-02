<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('share_visits', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('share_id');
            $table->string('ip_address', 45)->nullable();
            $table->string('user_agent')->nullable();
            $table->boolean('accessGranted')->default(false);
            $table->string('failure_reason')->nullable();
            $table->timestamp('visited_at');
            $table->timestamps();

            $table->foreign('share_id')->references('id')->on('shares')->onDelete('cascade');
            $table->index(['share_id', 'visited_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('share_visits');
    }
};
