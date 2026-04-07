<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Share;
use App\Models\ShareVisit;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class ShareController extends Controller
{
    /**
     * 列出当前用户创建的分享
     * GET /api/shares
     */
    public function mine(Request $request): JsonResponse
    {
        $shares = Share::where('created_by', $request->user()->id)
            ->with(['version.asset'])
            ->orderByDesc('created_at')
            ->paginate($request->get('per_page', 20));

        return response()->json($shares);
    }

    /**
     * 展示分享信息（无需登录）
     * GET /api/share/{token}
     */
    public function show(string $token): JsonResponse
    {
        $share = Share::where('token', $token)
            ->with(['version.asset'])
            ->firstOrFail();

        if (! $share->isActive()) {
            return response()->json(['message' => '分享链接已过期'], 403);
        }

        return response()->json([
            'share' => $share,
            'asset' => $share->version?->asset,
        ]);
    }

    /**
     * 验证分享密码
     * POST /api/share/{token}/verify
     */
    public function verify(Request $request, string $token): JsonResponse
    {
        $share = Share::where('token', $token)->firstOrFail();

        $validated = $request->validate([
            'password' => ['required', 'string'],
        ]);

        if (! Hash::check($validated['password'], $share->password_hash)) {
            return response()->json(['message' => '密码错误'], 403);
        }

        // 记录访问
        $share->visits()->create([
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ]);

        return response()->json(['message' => '验证成功']);
    }

    /**
     * 创建分享链接
     * POST /api/assets/{asset}/shares
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'asset_id'          => ['required', 'uuid', 'exists:assets,id'],
            'password'          => ['nullable', 'string', 'min:4'],
            'expires_at'        => ['nullable', 'date', 'after:now'],
            'permissions'        => ['nullable', 'array'],
            'watermark_policy'   => ['nullable', 'string'],
        ]);

        $asset = \App\Models\Asset::findOrFail($validated['asset_id']);
        $latestVersion = $asset->latestVersion;

        if (! $latestVersion) {
            return response()->json(['message' => '该资产没有可分享的版本'], 422);
        }

        $share = Share::create([
            'asset_version_id' => $latestVersion->id,
            'token'           => \Illuminate\Support\Str::random(64),
            'password_hash'   => isset($validated['password']) ? Hash::make($validated['password']) : null,
            'expires_at'      => $validated['expires_at'] ?? null,
            'permissions'     => $validated['permissions'] ?? [Share::PERMISSION_VIEW],
            'watermark_policy'=> $validated['watermark_policy'] ?? null,
            'is_active'       => true,
            'created_by'      => $request->user()->id,
        ]);

        return response()->json($share, 201);
    }

    /**
     * 列出某资产的分享
     * GET /api/assets/{asset}/shares
     */
    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'asset_id' => ['required', 'uuid', 'exists:assets,id'],
        ]);

        $shares = Share::where('asset_version_id', $validated['asset_id'])
            ->orderByDesc('created_at')
            ->get();

        return response()->json($shares);
    }

    /**
     * 删除分享
     * DELETE /api/assets/{asset}/shares/{share}
     */
    public function destroy(Request $request, string $asset, string $share): JsonResponse
    {
        $share = Share::where('id', $share)
            ->where('created_by', $request->user()->id)
            ->firstOrFail();

        $share->delete();

        return response()->json(['message' => '分享已删除']);
    }
}
