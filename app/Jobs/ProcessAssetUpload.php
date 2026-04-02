<?php

namespace App\Jobs;

use App\Models\Asset;
use App\Services\AssetProcessor;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

/**
 * 媒体文件异步处理任务
 *
 * 处理流程：
 * 1. ffprobe → 提取元数据（宽/高/时长/帧率）
 * 2. 缩略图（10张） → 雪碧图（VTT）
 * 3. 音频波形（JSON）
 * 4. HLS 转码（1080p/720p/480p）— 可选，Phase 2 开启
 */
class ProcessAssetUpload implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;
    public int $backoff = 30; // 秒

    public function __construct(
        public readonly Asset $asset
    ) {}

    public function handle(AssetProcessor $processor): void
    {
        Log::info("Processing asset", ['asset_id' => $this->asset->id]);

        try {
            $processor->process($this->asset);
        } catch (\Throwable $e) {
            Log::error("Asset processing failed", [
                'asset_id' => $this->asset->id,
                'error'    => $e->getMessage(),
            ]);

            $this->asset->markError();
            throw $e; // 让队列重试
        }
    }

    public function failed(\Throwable $e): void
    {
        Log::error("Asset processing permanently failed", [
            'asset_id' => $this->asset->id,
            'error'    => $e->getMessage(),
        ]);

        $this->asset->markError();
    }
}
