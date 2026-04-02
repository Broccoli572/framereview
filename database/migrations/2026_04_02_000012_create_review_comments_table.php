<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('review_comments', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('thread_id');
            $table->uuid('user_id');
            $table->uuid('parent_id')->nullable(); // 回复某条评论
            $table->text('content');
            $table->jsonb('mentions')->nullable(); // [@user_id, ...]
            $table->boolean('is_deleted')->default(false);
            $table->timestamps();

            $table->foreign('thread_id')->references('id')->on('review_threads')->onDelete('cascade');
            $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
            $table->foreign('parent_id')->references('id')->on('review_comments')->onDelete('set null');

            $table->index('thread_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('review_comments');
    }
};
