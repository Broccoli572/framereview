<?php

namespace App\Services;

use App\Models\Asset;
use App\Models\AssetVersion;
use App\Models\AssetPreview;
use App\Jobs\ProcessAssetUpload;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Storage;

/**
 * 资产上传服务
 * 支持：直传（小型文件）+ 分片上传（大型视频）
 * 上传完成后自动分发 ProcessAssetUpload 任务
 */
class AssetUploadService
{
    /**
     * 创建资产记录（刚选择文件时，立即创建 pending 记录）
     */
    public function initiateUpload(array $data): Asset
    {
        $mimeType = $data['mime_type'] ?? 'application/octet-stream';
        $type = Asset::inferType($mimeType);

        // 存储路径：projects/{project_id}/{uuid}/original.{ext}
        $ext = pathinfo($data['original_name'] ?? 'file', PATHINFO_EXTENSION);
        $storagePath = sprintf(
            'projects/%s/%s/original.%s',
            $data['project_id'],
            Str::uuid(),
            $ext ?: 'bin'
        );

        return Asset::create([
            'project_id'   => $data['project_id'],
            'folder_id'   => $data['folder_id'] ?? null,
            'name'        => $data['name'] ?? $data['original_name'],
            'original_name'=> $data['original_name'],
            'mime_type'   => $mimeType,
            'type'        => $type,
            'size_bytes'  => $data['size_bytes'] ?? 0,
            'storage_path'=> $storagePath,
            'status'      => Asset::STATUS_PENDING,
            'created_by'  => $data['user_id'],
        ]);
    }

    /**
     * 完成上传（所有分片合并后调用）
     * 计算 SHA256，触发媒体处理队列
     */
    public function finalizeUpload(Asset $asset, string $finalPath): Asset
    {
        // 计算文件哈希（流式，避免大文件内存爆炸）
        $sha256 = hash_file('sha256', $finalPath);

        $asset->update([
            'storage_path' => $finalPath,
            'sha256'      => $sha256,
            'status'      => Asset::STATUS_PROCESSING,
        ]);

        // 分发媒体处理任务
        ProcessAssetUpload::dispatch($asset);

        return $asset->fresh();
    }

    /**
     * 上传完成媒体处理后，更新资产元数据
     */
    public function updateMetadata(Asset $asset, array $metadata): Asset
    {
        $asset->update(array_filter([
            'width'       => $metadata['width'] ?? null,
            'height'      => $metadata['height'] ?? null,
            'duration'    => $metadata['duration'] ?? null,
            'frame_rate'  => $metadata['frame_rate'] ?? null,
            'metadata'    => $metadata,
        ], fn ($v) => $v !== null));

        $asset->markReady($metadata);

        return $asset->fresh();
    }

    /**
     * 生成预签名上传 URL（直连 MinIO / S3）
     * 前端拿到签名后直接 PUT 到对象存储，跳过 Laravel
     */
    public function createPresignedUploadUrl(Asset $asset, int $expiresInSeconds = 3600): array
    {
        $disk = Storage::disk('s3'); // 或 'minio'

        $url = $disk->temporaryUploadUrl(
            $asset->storage_path,
            now()->addSeconds($expiresInSeconds),
            [
                'Content-Type'  => $asset->mime_type,
                'Content-MD5'  => '', // 可选
            ]
        );

        return [
            'upload_url' => $url,
            'asset_id'  => $asset->id,
            'storage_path' => $asset->storage_path,
            'expires_at' => now()->addSeconds($expiresInSeconds)->toIso8601String(),
        ];
    }

    /**
     * 删除资产（软删除 + 清理存储文件）
     */
    public function deleteAsset(Asset $asset): bool
    {
        // 清理存储
        if ($asset->storage_path) {
            Storage::disk('s3')->delete($asset->storage_path);
        }

        // 清理缩略图等预览文件
        $asset->previews()->delete();

        return $asset->delete(); // 软删除
    }
}
