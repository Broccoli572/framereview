<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('review_threads', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('asset_version_id');
            $table->string('type')->default('timecode'); // timecode | frame | area
            $table->float('timecode_seconds')->nullable(); // 时间点（秒）
            $table->integer('frame_number')->nullable();    // 帧号
            $table->jsonb('area_coordinates')->nullable();  // 画面坐标 {x, y, width, height}
            $table->string('status')->default('open');      // open | resolved | confirmed
            $table->uuid('resolved_by')->nullable();
            $table->timestamp('resolved_at')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('asset_version_id')->references('id')->on('asset_versions')->onDelete('cascade');
            $table->foreign('resolved_by')->references('id')->on('users')->onDelete('set null');

            $table->index(['asset_version_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('review_threads');
    }
};
