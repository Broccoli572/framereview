<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Notification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class NotificationController extends Controller
{
    /**
     * 获取当前用户的通知列表（分页）
     * GET /api/notifications
     */
    public function index(Request $request): JsonResponse
    {
        $perPage = min((int) $request->query('per_page', 20), 100);

        $notifications = Notification::where('user_id', Auth::id())
            ->orderByDesc('created_at')
            ->paginate($perPage);

        return response()->json($notifications);
    }

    /**
     * 标记单条通知为已读
     * PATCH /api/notifications/{notification}/read
     */
    public function markRead(int $notificationId): JsonResponse
    {
        $notification = Notification::where('user_id', Auth::id())
            ->findOrFail($notificationId);

        $notification->markAsRead();

        return response()->json(['data' => $notification]);
    }

    /**
     * 全部标记为已读
     * PATCH /api/notifications/read-all
     */
    public function markAllRead(): JsonResponse
    {
        $updated = Notification::where('user_id', Auth::id())
            ->whereNull('read_at')
            ->update(['read_at' => now()]);

        return response()->json([
            'data' => ['marked_count' => $updated],
        ]);
    }

    /**
     * 获取未读数量
     * GET /api/notifications/unread-count
     */
    public function unreadCount(): JsonResponse
    {
        $count = Notification::where('user_id', Auth::id())
            ->whereNull('read_at')
            ->count();

        return response()->json(['data' => ['count' => $count]]);
    }
}
