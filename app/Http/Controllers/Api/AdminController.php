<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Models\Asset;
use App\Models\User;
use App\Models\Workspace;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AdminController extends Controller
{
    /**
     * 获取系统统计数据
     * GET /api/admin/stats
     */
    public function stats(Request $request): JsonResponse
    {
        $stats = [
            'users' => [
                'total'      => User::count(),
                'active'     => User::where('is_active', true)->count(),
                'new_today'  => User::whereDate('created_at', today())->count(),
            ],
            'workspaces' => [
                'total'      => Workspace::count(),
                'new_today'  => Workspace::whereDate('created_at', today())->count(),
            ],
            'assets' => [
                'total'      => Asset::count(),
                'total_size' => Asset::sum('size_bytes'),
                'by_status'  => Asset::selectRaw('status, count(*) as count')->groupBy('status')->pluck('count', 'status'),
                'new_today'  => Asset::whereDate('created_at', today())->count(),
            ],
        ];

        return response()->json($stats);
    }

    /**
     * 获取活动日志
     * GET /api/admin/activity-logs
     */
    public function activityLogs(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'per_page' => ['nullable', 'integer', 'min:10', 'max:100'],
        ]);

        $logs = ActivityLog::with('user')
            ->orderByDesc('created_at')
            ->paginate($validated['per_page'] ?? 30);

        return response()->json($logs);
    }
}
