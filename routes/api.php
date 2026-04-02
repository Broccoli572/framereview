<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api;

/*
|─────────────────────────────────────────────────────────────
| API 路由 — FrameReview V2
|─────────────────────────────────────────────────────────────
*/

// ── 公开路由（无需认证）─────────────────────────────────
Route::prefix('auth')->group(function () {
    Route::post('login', [Api\AuthController::class, 'login']);
    Route::post('register', [Api\AuthController::class, 'register']);
    Route::post('forgot-password', [Api\AuthController::class, 'forgotPassword']);
});

// 分享页（无需登录）
Route::prefix('share')->group(function () {
    Route::get('{token}', [Api\ShareController::class, 'show']);
    Route::post('{token}/verify', [Api\ShareController::class, 'verify']);
});

// ── 受保护路由 ──────────────────────────────────────────
Route::middleware('auth:sanctum')->group(function () {

    // 认证
    Route::prefix('auth')->group(function () {
        Route::post('logout', [Api\AuthController::class, 'logout']);
        Route::get('me', [Api\AuthController::class, 'me']);
    });

    // 工作空间
    Route::apiResource('workspaces', Api\WorkspaceController::class);
    Route::post('workspaces/{workspace}/invite', [Api\WorkspaceController::class, 'invite']);

    // 项目
    Route::apiResource('workspaces.projects', Api\ProjectController::class);

    // 文件夹树
    Route::apiResource('projects.folders', Api\FolderController::class);
    Route::get('folders/{folder}/tree', [Api\FolderController::class, 'tree']);

    // 资产上传
    Route::post('assets/upload/initiate', [Api\AssetUploadController::class, 'initiate'])
        ->name('assets.upload.initiate');
    Route::post('assets/upload/finalize/{assetId}', [Api\AssetUploadController::class, 'finalize'])
        ->name('assets.upload.finalize');
    Route::post('assets/upload', [Api\AssetUploadController::class, 'upload'])
        ->name('assets.upload');
    Route::get('assets/upload/{assetId}/status', [Api\AssetUploadController::class, 'status'])
        ->name('assets.upload.status');
    Route::delete('assets/upload/{assetId}', [Api\AssetUploadController::class, 'cancel'])
        ->name('assets.upload.cancel');

    // 资产
    Route::apiResource('folders.assets', Api\AssetController::class);
    Route::post('assets/{asset}/process', [Api\AssetController::class, 'triggerProcessing']);
    Route::get('assets/{asset}/stream', [Api\AssetController::class, 'stream']);

    // 版本
    Route::post('assets/{asset}/versions', [Api\AssetVersionController::class, 'store']);
    Route::get('assets/{asset}/versions', [Api\AssetVersionController::class, 'index']);

    // 审片 Threads
    Route::get('assets/{assetId}/versions/{versionId}/threads', [Api\ReviewThreadController::class, 'index']);
    Route::post('assets/{assetId}/versions/{versionId}/threads', [Api\ReviewThreadController::class, 'store']);
    Route::get('assets/{assetId}/versions/{versionId}/threads/in-range', [Api\ReviewThreadController::class, 'inRange']);
    Route::get('threads/{threadId}', [Api\ReviewThreadController::class, 'show']);
    Route::patch('threads/{threadId}', [Api\ReviewThreadController::class, 'update']);
    Route::delete('threads/{threadId}', [Api\ReviewThreadController::class, 'destroy']);

    // 审片评论
    Route::post('threads/{threadId}/comments', [Api\ReviewCommentController::class, 'store']);
    Route::delete('comments/{commentId}', [Api\ReviewCommentController::class, 'destroy']);
    Route::patch('comments/{commentId}/resolve', [Api\ReviewCommentController::class, 'resolve']);

    // 分享
    Route::apiResource('assets.shares', Api\ShareController::class)->only(['store', 'index', 'destroy']);
    Route::get('shares', [Api\ShareController::class, 'mine']);

    // 动态与通知
    Route::get('notifications', [Api\NotificationController::class, 'index']);
    Route::get('notifications/unread-count', [Api\NotificationController::class, 'unreadCount']);
    Route::patch('notifications/{notification}/read', [Api\NotificationController::class, 'markRead']);
    Route::patch('notifications/read-all', [Api\NotificationController::class, 'markAllRead']);

    // 搜索
    Route::get('search', [Api\SearchController::class, 'search']);

    // 管理
    Route::prefix('admin')->middleware('role:system_admin')->group(function () {
        Route::get('stats', [Api\AdminController::class, 'stats']);
        Route::get('activity-logs', [Api\AdminController::class, 'activityLogs']);
    });
});
