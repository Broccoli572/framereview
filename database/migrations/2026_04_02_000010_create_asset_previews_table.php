<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('asset_previews', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('asset_version_id')->unique();
            $table->string('poster_url')->nullable();   // 封面缩略图
            $table->string('sprite_url')->nullable();    // 雪碧图 strip
            $table->string('waveform_url')->nullable(); // 音频波形 JSON
            $table->string('proxy_url')->nullable();    // 低码流预览 MP4
            $table->string('hls_url')->nullable();       // HLS 播放列表
            $table->jsonb('metadata')->nullable();      // ffprobe 提取的元数据
            $table->jsonb('keyframes')->nullable();     // 关键帧时间点列表
            $table->timestamps();

            $table->foreign('asset_version_id')->references('id')->on('asset_versions')->onDelete('cascade');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('asset_previews');
    }
};
