<?php

namespace App\Http\Controllers;

use App\Models\Share;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Hash;

class ShareController extends Controller
{
    /**
     * 展示分享页（无需登录）
     */
    public function show(string $token): Response
    {
        $share = Share::where('token', $token)
            ->with('version.asset')
            ->firstOrFail();

        if (! $share->isActive()) {
            abort(403, '此链接已过期或已停用');
        }

        // 记录访问
        $share->visits()->create([
            'ip_address' => request()->ip(),
            'user_agent' => request()->userAgent(),
        ]);

        // 有密码则要求验证
        if ($share->password_hash) {
            if (! session('share_verified_' . $share->id)) {
                return response()->view('share.password', [
                    'share' => $share,
                    'token' => $token,
                ], 403);
            }
        }

        $version = $share->version;
        $asset = $version?->asset;

        return response()->view('share.show', [
            'share' => $share,
            'asset' => $asset,
            'version' => $version,
        ]);
    }
}
