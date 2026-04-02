<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('activity_logs', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('user_id')->nullable();
            $table->string('action');              // uploaded, deleted, shared, commented, resolved, version_created ...
            $table->string('subject_type')->nullable(); // App\Models\Asset, App\Models\Share ...
            $table->uuid('subject_id')->nullable();
            $table->jsonb('properties')->nullable();   // 记录变更前后的数据
            $table->string('ip_address', 45)->nullable();
            $table->string('user_agent')->nullable();
            $table->timestamp('created_at');

            $table->foreign('user_id')->references('id')->on('users')->onDelete('set null');
            $table->index(['subject_type', 'subject_id']);
            $table->index(['user_id', 'created_at']);
            $table->index('created_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('activity_logs');
    }
};
