<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('shares', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('asset_version_id');
            $table->string('token', 64)->unique(); // 分享链接唯一标识
            $table->string('password_hash')->nullable();
            $table->timestamp('expires_at')->nullable();
            $table->string('permissions')->default('view'); // view | download | download_hq
            $table->boolean('is_active')->default(true);
            $table->string('watermark_policy')->nullable(); // none | all | external_only
            $table->uuid('created_by');
            $table->timestamps();

            $table->foreign('asset_version_id')->references('id')->on('asset_versions')->onDelete('cascade');
            $table->foreign('created_by')->references('id')->on('users');

            $table->index('token');
            $table->index('expires_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('shares');
    }
};
