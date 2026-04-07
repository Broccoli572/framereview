<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Asset;
use App\Models\AssetVersion;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AssetVersionController extends Controller
{
    /**
     * 列出某资产的所有版本
     * GET /api/assets/{asset}/versions
     */
    public function index(Request $request, string $asset): JsonResponse
    {
        $asset = Asset::findOrFail($asset);

        $versions = $asset->versions()
            ->with('previews')
            ->orderByDesc('version_number')
            ->get();

        return response()->json($versions);
    }

    /**
     * 创建新版本
     * POST /api/assets/{asset}/versions
     */
    public function store(Request $request, string $asset): JsonResponse
    {
        $asset = Asset::findOrFail($asset);

        $validated = $request->validate([
            'file'            => ['required', 'file', 'max:10240'], // 10MB
            'change_summary'  => ['nullable', 'string', 'max:500'],
        ]);

        $uploadedFile = $validated['file'];

        // 计算新版本号
        $latestVersion = $asset->versions()->max('version_number') ?? 0;
        $newVersionNumber = $latestVersion + 1;

        // 存储文件
        $storagePath = $asset->storage_path . '/versions/' . $newVersionNumber;
        $filename = $uploadedFile->getClientOriginalName();
        $path = $uploadedFile->storeAs($storagePath, $filename, 'local');

        // 创建版本记录
        $version = AssetVersion::create([
            'asset_id'        => $asset->id,
            'version_number'  => $newVersionNumber,
            'storage_path'    => $path,
            'original_name'   => $filename,
            'mime_type'       => $uploadedFile->getMimeType(),
            'size_bytes'      => $uploadedFile->getSize(),
            'change_summary'  => $validated['change_summary'] ?? null,
            'created_by'      => $request->user()->id,
        ]);

        // 更新资产的当前版本
        $asset->update(['current_version_id' => $version->id]);

        return response()->json($version->load('previews'), 201);
    }
}
