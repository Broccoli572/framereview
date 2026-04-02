<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('assets', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('folder_id');
            $table->uuid('current_version_id')->nullable();
            $table->string('name');
            $table->string('mime_type');
            $table->unsignedBigInteger('size_bytes')->default(0);
            $table->string('sha256')->nullable(); // 完整性校验
            $table->string('status')->default('pending'); // pending, processing, ready, error
            $table->jsonb('metadata')->nullable(); // 原始文件元数据
            $table->jsonb('tags')->nullable();
            $table->uuid('created_by');
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('folder_id')->references('id')->on('folders')->onDelete('cascade');
            $table->foreign('created_by')->references('id')->on('users');

            $table->index(['folder_id', 'status']);
            $table->index('sha256');
            $table->fullText(['name']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('assets');
    }
};
