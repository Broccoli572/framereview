<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Asset;
use App\Services\AssetUploadService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rules\File;

/**
 * 资产上传 API
 *
 * 支持两种上传模式：
 * 1. 简单上传（小文件 / 头像等）：直接 POST /api/assets/upload
 * 2. 预签名直连（大文件视频）：POST /api/assets/upload/initiate → 前端直传 MinIO → POST /api/assets/upload/finalize
 */
class AssetUploadController extends Controller
{
    public function __construct(
        private readonly AssetUploadService $uploadService
    ) {}

    /**
     * 预签名上传初始化
     * 前端拿到 upload_url 后直接 PUT 到 MinIO，跳过 PHP 层
     *
     * POST /api/assets/upload/initiate
     */
    public function initiate(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'project_id'    => ['required', 'uuid', 'exists:projects,id'],
            'folder_id'     => ['nullable', 'uuid', 'exists:folders,id'],
            'name'          => ['required', 'string', 'max:255'],
            'original_name' => ['required', 'string', 'max:500'],
            'size_bytes'    => ['required', 'integer', 'min:1', 'max:10_737_418_240], // 10GB
            'mime_type'     => ['required', 'string'],
        ]);

        // 权限校验：用户必须是 project 所在 workspace 的 member
        $this->authorizeProjectAccess($request->user(), $validated['project_id']);

        $asset = $this->uploadService->initiateUpload([
            ...$validated,
            'user_id' => $request->user()->id,
        ]);

        // 生成分片预签名 URL（支持 5GB+ 大文件分片）
        $presigned = $this->uploadService->createPresignedUploadUrl($asset);

        return response()->json([
            'asset'  => $asset,
            'upload' => $presigned,
        ], 201);
    }

    /**
     * 确认上传完成（前端直传完成后通知后端）
     * 后端验证文件存在后，触发媒体处理队列
     *
     * POST /api/assets/upload/finalize/{assetId}
     */
    public function finalize(Request $request, string $assetId): JsonResponse
    {
        $asset = Asset::where('id', $assetId)
            ->where('status', Asset::STATUS_PENDING)
            ->firstOrFail();

        // 权限校验
        $this->authorizeProjectAccess($request->user(), $asset->project_id);

        // 验证文件是否真实存在于存储
        $exists = Storage::disk('s3')->exists($asset->storage_path);
        if (! $exists) {
            return response()->json(['message' => 'File not found in storage'], 422);
        }

        $asset = $this->uploadService->finalizeUpload($asset, $asset->storage_path);

        return response()->json([
            'asset'  => $asset->load('currentVersion'),
            'message' => 'Upload finalized, processing started',
        ]);
    }

    /**
     * 简单上传（小文件，直接 multipart）
     * 适用于图片、PDF 等小于 100MB 的文件
     *
     * POST /api/assets/upload
     */
    public function upload(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'project_id' => ['required', 'uuid', 'exists:projects,id'],
            'folder_id'  => ['nullable', 'uuid', 'exists:folders,id'],
            'file'       => [
                'required',
                File::types(['jpg', 'jpeg', 'png', 'gif', 'webp', 'pdf', 'mp4', 'mov', 'avi'])
                    ->max(100 * 1024), // 100MB
            ],
        ]);

        $this->authorizeProjectAccess($request->user(), $validated['project_id']);

        /** @var \Illuminate\Http\UploadedFile $file */
        $file = $validated['file'];

        // 存入 MinIO/S3
        $asset = $this->uploadService->initiateUpload([
            'project_id'   => $validated['project_id'],
            'folder_id'    => $validated['folder_id'] ?? null,
            'name'         => $file->getClientOriginalName(),
            'original_name'=> $file->getClientOriginalName(),
            'size_bytes'   => $file->getSize(),
            'mime_type'    => $file->getMimeType(),
            'user_id'      => $request->user()->id,
        ]);

        $path = Storage::disk('s3')->putFileAs(
            dirname($asset->storage_path),
            $file,
            basename($asset->storage_path),
            ['ContentType' => $asset->mime_type]
        );

        $asset = $this->uploadService->finalizeUpload($asset, $path);

        return response()->json([
            'asset' => $asset->load('currentVersion'),
        ], 201);
    }

    /**
     * 轮询上传状态（前端用来确认处理完成）
     *
     * GET /api/assets/upload/{assetId}/status
     */
    public function status(Request $request, string $assetId): JsonResponse
    {
        $asset = Asset::with(['currentVersion', 'previews'])->findOrFail($assetId);

        $this->authorizeProjectAccess($request->user(), $asset->project_id);

        return response()->json([
            'asset' => $asset,
        ]);
    }

    /**
     * 取消上传（清理已创建的 pending 记录）
     *
     * DELETE /api/assets/upload/{assetId}
     */
    public function cancel(Request $request, string $assetId): JsonResponse
    {
        $asset = Asset::where('id', $assetId)
            ->where('status', Asset::STATUS_PENDING)
            ->firstOrFail();

        $this->authorizeProjectAccess($request->user(), $asset->project_id);

        // 清理存储中的空文件
        if ($asset->storage_path) {
            Storage::disk('s3')->delete($asset->storage_path);
        }

        $asset->delete();

        return response()->json(['message' => 'Upload cancelled']);
    }

    // ─── 私有辅助 ─────────────────────────────────────────────────

    private function authorizeProjectAccess(\App\Models\User $user, string $projectId): void
    {
        // 通过 workspace 成员关系校验
        $project = \App\Models\Project::findOrFail($projectId);
        $membership = $user->workspaceMemberships()
            ->where('workspace_id', $project->workspace_id)
            ->first();

        if (! $membership || ! in_array($membership->role, ['owner', 'admin', 'member'])) {
            abort(403, 'No access to this project');
        }
    }
}
