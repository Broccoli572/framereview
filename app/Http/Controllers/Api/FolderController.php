<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Folder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class FolderController extends Controller
{
    /**
     * 列出指定项目的文件夹（根级）
     * GET /api/projects/{project}/folders
     */
    public function index(Request $request, string $project): JsonResponse
    {
        $folders = Folder::where('project_id', $project)
            ->whereNull('parent_id')
            ->withCount('assets')
            ->orderBy('name')
            ->get();

        return response()->json(['folders' => $folders]);
    }

    /**
     * 创建文件夹
     * POST /api/projects/{project}/folders
     */
    public function store(Request $request, string $project): JsonResponse
    {
        $validated = $request->validate([
            'name'      => ['required', 'string', 'max:255'],
            'parent_id' => ['nullable', 'uuid', 'exists:folders,id'],
        ]);

        // 校验 parent 确实属于这个 project
        if (! empty($validated['parent_id'])) {
            $parent = Folder::where('id', $validated['parent_id'])
                ->where('project_id', $project)
                ->firstOrFail();
        }

        $folder = Folder::create([
            'project_id' => $project,
            'parent_id'  => $validated['parent_id'] ?? null,
            'name'      => $validated['name'],
            'created_by'=> $request->user()->id,
        ]);

        return response()->json($folder->loadCount('assets'), 201);
    }

    /**
     * 获取文件夹详情
     * GET /api/projects/{project}/folders/{folder}
     */
    public function show(string $project, string $folder): JsonResponse
    {
        $folder = Folder::where('project_id', $project)
            ->with(['parent', 'children', 'assets'])
            ->findOrFail($folder);

        return response()->json($folder);
    }

    /**
     * 更新文件夹
     * PATCH /api/projects/{project}/folders/{folder}
     */
    public function update(Request $request, string $project, string $folder): JsonResponse
    {
        $folder = Folder::where('project_id', $project)->findOrFail($folder);

        $validated = $request->validate([
            'name'      => ['sometimes', 'string', 'max:255'],
            'parent_id' => ['nullable', 'uuid', 'exists:folders,id'],
        ]);

        // 防止将文件夹移动到自己或自己的子文件夹下
        if (isset($validated['parent_id'])) {
            $this->preventCircularReference($folder, $validated['parent_id']);
        }

        $folder->update($validated);

        return response()->json($folder->loadCount('assets'));
    }

    /**
     * 删除文件夹（软删除）
     * DELETE /api/projects/{project}/folders/{folder}
     */
    public function destroy(string $project, string $folder): JsonResponse
    {
        $folder = Folder::where('project_id', $project)->findOrFail($folder);
        $folder->delete();

        return response()->json(['message' => 'Folder deleted']);
    }

    /**
     * 获取文件夹完整树形结构
     * GET /api/folders/{folder}/tree
     */
    public function tree(string $folder): JsonResponse
    {
        $folder = Folder::with('allDescendants')->findOrFail($folder);

        return response()->json(['tree' => $folder->load('children')]);
    }

    /**
     * 防止循环引用：parent 不能是自己的后代
     */
    private function preventCircularReference(Folder $folder, string $newParentId): void
    {
        $descendantIds = $folder->allDescendants()->pluck('id')->toArray();

        if (in_array($newParentId, $descendantIds)) {
            abort(422, 'Cannot move folder into its own descendant');
        }
    }
}
