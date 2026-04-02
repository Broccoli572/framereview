<?php

namespace App\Http\Controllers\Api;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules\Password;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    /**
     * 注册
     */
    public function register(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name'     => ['required', 'string', 'max:255'],
            'email'    => ['required', 'string', 'email', 'max:255', 'unique:users'],
            'password' => ['required', 'confirmed', Password::min(8)->mixedCase()->symbols()],
        ]);

        $user = User::create([
            'name'     => $validated['name'],
            'email'    => $validated['email'],
            'password' => Hash::make($validated['password']),
        ]);

        $token = $user->createToken('api-token')->plainTextToken;

        return response()->json([
            'user'  => $user->load('roles'),
            'token' => $token,
        ], 201);
    }

    /**
     * 登录
     */
    public function login(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'email'    => ['required', 'string', 'email'],
            'password' => ['required', 'string'],
        ]);

        $user = User::where('email', $validated['email'])->first();

        if (! $user || ! Hash::check($validated['password'], $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['The provided credentials are incorrect.'],
            ]);
        }

        // 清除旧 Token（可选：允许多设备）
        // $user->tokens()->delete();

        $token = $user->createToken('api-token')->plainTextToken;

        return response()->json([
            'user'  => $user->load('roles'),
            'token' => $token,
        ]);
    }

    /**
     * 登出（删除当前 Token）
     */
    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json(['message' => 'Logged out']);
    }

    /**
     * 当前用户信息
     */
    public function me(Request $request): JsonResponse
    {
        return response()->json([
            'user' => $request->user()->load('roles'),
        ]);
    }

    /**
     * 切换 Workspace（写入 session/上下文）
     */
    public function switchWorkspace(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'workspace_id' => ['required', 'uuid', 'exists:workspaces,id'],
        ]);

        $user = $request->user();

        // 校验用户是否属于该 Workspace
        $membership = $user->workspaceMemberships()
            ->where('workspace_id', $validated['workspace_id'])
            ->first();

        if (! $membership) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        // 写入上下文（通过中间件 CurrentWorkspace 注入）
        $request->session()->put('current_workspace_id', $validated['workspace_id']);

        return response()->json([
            'workspace_id' => $validated['workspace_id'],
            'role'         => $membership->role,
        ]);
    }

    /**
     * 获取用户可访问的 Workspace 列表
     */
    public function workspaces(Request $request): JsonResponse
    {
        $workspaces = $request->user()
            ->workspaceMemberships()
            ->with('workspace')
            ->get()
            ->map(fn ($m) => [
                'id'    => $m->workspace->id,
                'name'  => $m->workspace->name,
                'role'  => $m->role,
                'avatar'=> $m->workspace->avatar_url,
            ]);

        return response()->json(['workspaces' => $workspaces]);
    }
}
