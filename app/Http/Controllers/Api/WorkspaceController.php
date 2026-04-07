<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Workspace;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class WorkspaceController extends Controller
{
    /**
     * 列出当前用户的工作空间
     * GET /api/workspaces
     */
    public function index(Request $request): JsonResponse
    {
        $workspaces = $request->user()->workspaces()->get();

        return response()->json($workspaces);
    }

    /**
     * 创建工作空间
     * POST /api/workspaces
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'slug' => ['nullable', 'string', 'max:100', 'unique:workspaces,slug'],
        ]);

        $workspace = Workspace::create([
            'name' => $validated['name'],
            'slug' => $validated['slug'] ?? Str::slug($validated['name']) . '-' . Str::random(6),
        ]);

        // 创建者自动成为 owner
        $workspace->users()->attach($request->user()->id, ['role' => 'owner']);

        return response()->json($workspace->load('users'), 201);
    }

    /**
     * 获取单个工作空间
     * GET /api/workspaces/{workspace}
     */
    public function show(Request $request, string $workspace): JsonResponse
    {
        $workspace = Workspace::with(['users', 'projects'])
            ->findOrFail($workspace);

        return response()->json($workspace);
    }

    /**
     * 更新工作空间
     * PATCH /api/workspaces/{workspace}
     */
    public function update(Request $request, string $workspace): JsonResponse
    {
        $workspace = Workspace::findOrFail($workspace);

        $validated = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'logo' => ['nullable', 'string', 'url'],
        ]);

        $workspace->update($validated);

        return response()->json($workspace);
    }

    /**
     * 删除工作空间
     * DELETE /api/workspaces/{workspace}
     */
    public function destroy(Request $request, string $workspace): JsonResponse
    {
        $workspace = Workspace::findOrFail($workspace);
        $workspace->delete();

        return response()->json(['message' => '工作空间已删除']);
    }

    /**
     * 邀请成员加入工作空间
     * POST /api/workspaces/{workspace}/invite
     */
    public function invite(Request $request, string $workspace): JsonResponse
    {
        $workspace = Workspace::findOrFail($workspace);

        $validated = $request->validate([
            'email' => ['required', 'email', 'exists:users,email'],
            'role'  => ['required', 'in:admin,member,viewer'],
        ]);

        $user = \App\Models\User::where('email', $validated['email'])->firstOrFail();

        // 检查是否已在工作空间
        if ($workspace->users()->where('user_id', $user->id)->exists()) {
            return response()->json(['message' => '该用户已在工作空间中'], 422);
        }

        $workspace->users()->attach($user->id, ['role' => $validated['role']]);

        return response()->json(['message' => '邀请成功'], 201);
    }
}
