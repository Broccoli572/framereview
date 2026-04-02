<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('folders', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('project_id');
            $table->uuid('parent_id')->nullable(); // 树形自引用
            $table->string('name');
            $table->integer('sort_order')->default(0);
            $table->uuid('created_by');
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('project_id')->references('id')->on('projects')->onDelete('cascade');
            $table->foreign('parent_id')->references('id')->on('folders')->onDelete('set null');
            $table->foreign('created_by')->references('id')->on('users');

            $table->index(['project_id', 'parent_id']);
            $table->index(['project_id', 'sort_order']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('folders');
    }
};
