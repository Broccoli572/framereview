<?php

namespace App\Services;

use App\Models\Asset;
use App\Models\AssetPreview;
use App\Models\AssetVersion;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * 媒体文件处理器
 * 负责从 MinIO/S3 读取源文件，运行 ffmpeg 任务，产出预览文件并回写元数据
 *
 * 注意：ffmpeg 命令实际运行在 media-worker 容器中
 * 这里通过 BullMQ HTTP API 派发任务（不直接调用 ffmpeg）
 */
class AssetProcessor
{
    private const MEDIA_WORKER_URL = 'http://media-worker:3001';

    public function process(Asset $asset): void
    {
        Log::info('AssetProcessor: starting', ['asset_id' => $asset->id]);

        // 1. 获取源文件 URL
        $sourceUrl = $this->getSourceUrl($asset);

        // 2. 派发 ffprobe 任务 → 提取元数据
        $metadata = $this->dispatchFfprobe($asset, $sourceUrl);
        $this->applyMetadata($asset, $metadata);

        // 3. 派发缩略图任务（视频/音频）
        if ($asset->isVideo() || $asset->isAudio()) {
            $this->dispatchThumbnails($asset, $sourceUrl);
        }

        // 4. 派发波形任务（音频）
        if ($asset->isAudio()) {
            $this->dispatchWaveform($asset, $sourceUrl);
        }

        Log::info('AssetProcessor: all tasks dispatched', ['asset_id' => $asset->id]);
    }

    private function getSourceUrl(Asset $asset): string
    {
        // 生成本地访问路径（media-worker 与 MinIO 同网络）
        return rtrim(config('filesystems.disks.s3.url'), '/')
            . '/'
            . ltrim($asset->storage_path, '/');
    }

    private function dispatchFfprobe(Asset $asset, string $sourceUrl): array
    {
        $response = Http::timeout(30)
            ->asJson()
            ->post(self::MEDIA_WORKER_URL . '/tasks/ffprobe', [
                'asset_id'    => $asset->id,
                'source_url'  => $sourceUrl,
                'storage_path'=> $asset->storage_path,
            ]);

        if (! $response->successful()) {
            Log::warning('ffprobe dispatch failed, using defaults', [
                'asset_id' => $asset->id,
                'status'   => $response->status(),
            ]);
            return [];
        }

        return $response->json()['metadata'] ?? [];
    }

    private function dispatchThumbnails(Asset $asset, string $sourceUrl): void
    {
        Http::asJson()->post(self::MEDIA_WORKER_URL . '/tasks/thumbnail', [
            'asset_id'    => $asset->id,
            'source_url'  => $sourceUrl,
            'storage_path'=> $asset->storage_path,
            'count'       => 10,
        ]);
    }

    private function dispatchWaveform(Asset $asset, string $sourceUrl): void
    {
        Http::asJson()->post(self::MEDIA_WORKER_URL . '/tasks/waveform', [
            'asset_id'    => $asset->id,
            'source_url'  => $sourceUrl,
            'storage_path'=> $asset->storage_path,
        ]);
    }

    private function applyMetadata(Asset $asset, array $metadata): void
    {
        $update = array_filter([
            'width'      => $metadata['width'] ?? null,
            'height'     => $metadata['height'] ?? null,
            'duration'   => $metadata['duration'] ?? null,
            'frame_rate' => isset($metadata['frame_rate']) ? (float) $metadata['frame_rate'] : null,
            'metadata'   => $metadata,
        ], fn ($v) => $v !== null);

        if (! empty($update)) {
            $asset->update($update);
        }
    }
}
