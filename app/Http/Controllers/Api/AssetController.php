<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Asset;
use App\Models\Folder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AssetController extends Controller
{
    /**
     * 列出资产
     *
     * GET /api/folders/{folder}/assets        — 文件夹内资产
     * GET /api/projects/{project}/assets     — 项目全部资产
     *
     * Query 参数：
     * - type: video|audio|image|document|archive
     * - status: pending|processing|ready|error
     * - sort: created_at|updated_at|name|size
     * - dir: asc|desc
     * - search: 名称模糊搜索
     */
    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'type'   => ['nullable', 'in:video,audio,image,document,archive'],
            'status' => ['nullable', 'in:pending,processing,ready,error'],
            'sort'   => ['nullable', 'in:created_at,updated_at,name,size'],
            'dir'    => ['nullable', 'in:asc,desc'],
            'search' => ['nullable', 'string', 'max:255'],
            'per_page' => ['nullable', 'integer', 'min:10', 'max:100'],
        ]);

        $query = Asset::query();

        // 范围限定
        if ($folderId = $request->route('folder')) {
            $query->where('folder_id', $folderId);
        } elseif ($projectId = $request->route('project')) {
            $query->where('project_id', $projectId);
        } else {
            abort(400, 'Must specify folder or project');
        }

        // 筛选
        if (! empty($validated['type'])) {
            $query->where('type', $validated['type']);
        }
        if (! empty($validated['status'])) {
            $query->where('status', $validated['status']);
        }
        if (! empty($validated['search'])) {
            $query->where('name', 'like', '%' . $validated['search'] . '%');
        }

        // 排序
        $sort = $validated['sort'] ?? 'created_at';
        $dir  = $validated['dir'] ?? 'desc';
        $query->orderBy($sort, $dir);

        // 预加载
        $query->with(['currentVersion', 'previews', 'creator']);

        $assets = $query->paginate($validated['per_page'] ?? 30);

        return response()->json($assets);
    }

    /**
     * 获取单个资产
     * GET /api/assets/{asset}
     */
    public function show(string $asset): JsonResponse
    {
        $asset = Asset::with([
            'currentVersion',
            'versions',
            'previews',
            'reviewThreads.comments',
            'creator',
            'folder',
        ])->findOrFail($asset);

        return response()->json($asset);
    }

    /**
     * 更新资产信息（名称、标签）
     * PATCH /api/assets/{asset}
     */
    public function update(Request $request, string $asset): JsonResponse
    {
        $asset = Asset::findOrFail($asset);

        $validated = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'tags' => ['nullable', 'array'],
            'tags.*' => ['string', 'max:50'],
        ]);

        $asset->update(array_filter($validated));

        return response()->json($asset);
    }

    /**
     * 删除资产（软删除）
     * DELETE /api/assets/{asset}
     */
    public function destroy(Request $request, string $asset): JsonResponse
    {
        $asset = Asset::findOrFail($asset);

        // 权限校验：member 及以上可删除自己上传的，owner/admin 可删除任意
        // 简化处理
        $asset->delete();

        return response()->json(['message' => 'Asset deleted']);
    }

    /**
     * 移动资产到其他文件夹
     * POST /api/assets/{asset}/move
     */
    public function move(Request $request, string $asset): JsonResponse
    {
        $asset = Asset::findOrFail($asset);

        $validated = $request->validate([
            'folder_id' => ['nullable', 'uuid', 'exists:folders,id'],
            'project_id'=> ['sometimes', 'uuid', 'exists:projects,id'],
        ]);

        // 校验目标文件夹确实属于同一项目
        if (! empty($validated['folder_id'])) {
            $folder = Folder::find($validated['folder_id']);
            if ($folder && $folder->project_id !== $asset->project_id) {
                abort(422, 'Cannot move asset to a different project');
            }
        }

        $asset->update([
            'folder_id'   => $validated['folder_id'] ?? null,
            'project_id'  => $validated['project_id'] ?? $asset->project_id,
        ]);

        return response()->json($asset);
    }

    /**
     * 批量移动资产
     * POST /api/assets/batch-move
     */
    public function batchMove(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'asset_ids' => ['required', 'array', 'min:1', 'max:100'],
            'asset_ids.*' => ['uuid', 'exists:assets,id'],
            'folder_id' => ['nullable', 'uuid', 'exists:folders,id'],
        ]);

        $count = Asset::whereIn('id', $validated['asset_ids'])
            ->update(['folder_id' => $validated['folder_id'] ?? null]);

        return response()->json(['moved' => $count]);
    }

    /**
     * 批量删除资产
     * POST /api/assets/batch-delete
     */
    public function batchDelete(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'asset_ids' => ['required', 'array', 'min:1', 'max:100'],
            'asset_ids.*' => ['uuid', 'exists:assets,id'],
        ]);

        $count = Asset::whereIn('id', $validated['asset_ids'])->delete();

        return response()->json(['deleted' => $count]);
    }

    /**
     * 批量更新标签
     * POST /api/assets/batch-tags
     */
    public function batchTags(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'asset_ids' => ['required', 'array', 'min:1', 'max:100'],
            'asset_ids.*' => ['uuid', 'exists:assets,id'],
            'tags' => ['required', 'array'],
            'tags.*' => ['string', 'max:50'],
        ]);

        $count = Asset::whereIn('id', $validated['asset_ids'])
            ->update(['tags' => $validated['tags']]);

        return response()->json(['updated' => $count]);
    }

    /**
     * 手动触发媒体处理
     * POST /api/assets/{asset}/process
     */
    public function triggerProcessing(string $asset): JsonResponse
    {
        $asset = Asset::findOrFail($asset);

        if ($asset->status !== Asset::STATUS_ERROR) {
            return response()->json(['message' => 'Asset is not in error state'], 422);
        }

        $asset->update(['status' => Asset::STATUS_PROCESSING]);
        \App\Jobs\ProcessAssetUpload::dispatch($asset);

        return response()->json(['message' => 'Processing re-triggered']);
    }

    /**
     * 视频流播放地址（签名 URL）
     * GET /api/assets/{asset}/stream
     */
    public function stream(Request $request, string $asset): JsonResponse
    {
        $asset = Asset::findOrFail($asset);

        if (! $asset->isVideo() || ! $asset->isReady()) {
            abort(422, 'Asset is not a ready video');
        }

        // 生成临时播放 URL（15分钟有效）
        $url = \Illuminate\Support\Facades\Storage::disk('s3')
            ->temporaryUrl($asset->currentVersion?->storage_path ?? $asset->storage_path, now()->addMinutes(15));

        return response()->json([
            'stream_url' => $url,
            'expires_at' => now()->addMinutes(15)->toIso8601String(),
            'asset' => $asset->only(['id', 'name', 'duration', 'width', 'height']),
        ]);
    }
}
