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
            $table->uuid('project_id');
            $table->uuid('folder_id')->nullable(); // 根目录资产允许 null
            $table->uuid('current_version_id')->nullable();
            $table->string('name');
            $table->string('original_name')->nullable();
            $table->string('mime_type');
            $table->unsignedBigInteger('size_bytes')->default(0);
            $table->string('sha256')->nullable(); // 完整性校验
            $table->string('type')->default('video'); // video, audio, image, document, archive
            $table->string('status')->default('pending'); // pending, uploading, processing, ready, error
            $table->string('storage_path')->nullable();
            $table->jsonb('metadata')->nullable(); // 原始文件元数据
            $table->jsonb('tags')->nullable();
            $table->uuid('created_by');
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('project_id')->references('id')->on('projects')->onDelete('cascade');
            $table->foreign('folder_id')->references('id')->on('folders')->onDelete('set null');
            $table->foreign('created_by')->references('id')->on('users');

            $table->index(['folder_id', 'status']);
            $table->index(['project_id', 'status']);
            $table->index('sha256');
            $table->fullText(['name']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('assets');
    }
};
