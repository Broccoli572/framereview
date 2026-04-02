<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Project;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ProjectController extends Controller
{
    /**
     * 列出当前 Workspace 下的所有项目
     * GET /api/workspaces/{workspace}/projects
     */
    public function index(Request $request, string $workspace): JsonResponse
    {
        $projects = Project::where('workspace_id', $workspace)
            ->with(['folder', 'stats', 'latestAsset'])
            ->orderByDesc('created_at')
            ->paginate($request->get('per_page', 20));

        return response()->json($projects);
    }

    /**
     * 创建项目
     * POST /api/workspaces/{workspace}/projects
     */
    public function store(Request $request, string $workspace): JsonResponse
    {
        $validated = $request->validate([
            'name'        => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:1000'],
        ]);

        $project = Project::create([
            'workspace_id' => $workspace,
            'name'        => $validated['name'],
            'description' => $validated['description'] ?? null,
        ]);

        return response()->json($project->load('folder'), 201);
    }

    /**
     * 获取单个项目
     * GET /api/workspaces/{workspace}/projects/{project}
     */
    public function show(Request $request, string $workspace, string $project): JsonResponse
    {
        $project = Project::where('workspace_id', $workspace)
            ->with(['folders', 'stats', 'members'])
            ->findOrFail($project);

        return response()->json($project);
    }

    /**
     * 更新项目
     * PATCH /api/workspaces/{workspace}/projects/{project}
     */
    public function update(Request $request, string $workspace, string $project): JsonResponse
    {
        $project = Project::where('workspace_id', $workspace)->findOrFail($project);

        $validated = $request->validate([
            'name'        => ['sometimes', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:1000'],
            'status'      => ['sometimes', 'in:active,archived'],
        ]);

        $project->update($validated);

        return response()->json($project);
    }

    /**
     * 删除项目
     * DELETE /api/workspaces/{workspace}/projects/{project}
     */
    public function destroy(Request $request, string $workspace, string $project): JsonResponse
    {
        $project = Project::where('workspace_id', $workspace)->findOrFail($project);
        $project->delete();

        return response()->json(['message' => 'Project deleted']);
    }
}
