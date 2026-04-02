<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('asset_versions', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('asset_id');
            $table->unsignedInteger('version_number');
            $table->string('file_path'); // 相对路径，完整路径 = MEDIA_ROOT + file_path
            $table->unsignedBigInteger('size_bytes')->default(0);
            $table->string('sha256')->nullable();
            $table->text('notes')->nullable();
            $table->uuid('uploaded_by');
            $table->timestamps();

            $table->foreign('asset_id')->references('id')->on('assets')->onDelete('cascade');
            $table->foreign('uploaded_by')->references('id')->on('users');

            $table->unique(['asset_id', 'version_number']);
            $table->index('asset_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('asset_versions');
    }
};
