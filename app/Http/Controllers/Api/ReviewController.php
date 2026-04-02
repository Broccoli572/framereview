<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Asset;
use App\Models\AssetVersion;
use App\Models\ReviewThread;
use App\Models\ReviewComment;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Validator;

class ReviewController extends Controller
{
    /**
     * 获取指定版本的全部 Review Threads（含评论数、是否已解析）
     * GET /api/assets/{assetId}/versions/{versionId}/threads
     */
    public function threads(int $assetId, int $versionId): JsonResponse
    {
        $version = AssetVersion::where('asset_id', $assetId)
            ->where('id', $versionId)
            ->firstOrFail();

        $threads = $version->threads()
            ->with(['comments' => fn($q) => $q->with('user')->orderBy('created_at')])
            ->withCount('comments')
            ->orderByDesc('timecode_seconds')
            ->get()
            ->append(['is_resolved']);

        return response()->json(['data' => $threads]);
    }

    /**
     * 创建 Review Thread（含第一条评论）
     * POST /api/assets/{assetId}/versions/{versionId}/threads
     */
    public function store(Request $request, int $assetId, int $versionId): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'type'        => 'required|in:timecode,frame,area',
            'timecode_seconds' => 'required_unless:type,area|nullable|numeric|min:0',
            'frame_number'    => 'required_if:type,frame|nullable|integer|min:0',
            'area_coordinates' => 'required_if:type,area|nullable|array',
            'comment'     => 'required|string|max:5000',
            'mentions'    => 'nullable|array',
            'mentions.*'  => 'uuid',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $version = AssetVersion::where('asset_id', $assetId)
            ->where('id', $versionId)
            ->firstOrFail();

        $user = Auth::user();

        $thread = ReviewThread::create([
            'asset_version_id'   => $version->id,
            'type'                => $request->type,
            'timecode_seconds'   => $request->timecode_seconds,
            'frame_number'        => $request->frame_number,
            'area_coordinates'    => $request->area_coordinates,
            'status'              => ReviewThread::STATUS_OPEN,
        ]);

        // 第一条评论
        $comment = ReviewComment::create([
            'thread_id' => $thread->id,
            'user_id'   => $user->id,
            'content'   => $request->comment,
            'mentions'  => $request->mentions ?? [],
        ]);

        $thread->load(['comments' => fn($q) => $q->with('user')->orderBy('created_at')]);
        $thread->loadCount('comments');

        return response()->json(['data' => $thread->append(['is_resolved'])], 201);
    }

    /**
     * 更新 Thread 状态（标记为 resolved / confirmed）
     * PATCH /api/threads/{threadId}
     */
    public function update(Request $request, int $threadId): JsonResponse
    {
        $thread = ReviewThread::findOrFail($threadId);

        $validator = Validator::make($request->all(), [
            'status' => 'required|in:open,resolved,confirmed',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $user = Auth::user();

        if ($request->status === ReviewThread::STATUS_RESOLVED) {
            $thread->update([
                'status'       => ReviewThread::STATUS_RESOLVED,
                'resolved_by'   => $user->id,
                'resolved_at'  => now(),
            ]);
        } elseif ($request->status === ReviewThread::STATUS_OPEN) {
            // 重新打开
            $thread->update([
                'status'       => ReviewThread::STATUS_OPEN,
                'resolved_by'   => null,
                'resolved_at'  => null,
            ]);
        } else {
            $thread->update(['status' => $request->status]);
        }

        return response()->json(['data' => $thread->append(['is_resolved'])]);
    }

    /**
     * 删除 Thread（软删除）
     * DELETE /api/threads/{threadId}
     */
    public function destroy(int $threadId): JsonResponse
    {
        $thread = ReviewThread::findOrFail($threadId);
        $thread->delete();

        return response()->json(null, 204);
    }

    // ─── 评论 ────────────────────────────────────────────────────────────────

    /**
     * 添加评论（回复）
     * POST /api/threads/{threadId}/comments
     */
    public function addComment(Request $request, int $threadId): JsonResponse
    {
        $thread = ReviewThread::findOrFail($threadId);

        $validator = Validator::make($request->all(), [
            'content'  => 'required|string|max:5000',
            'mentions' => 'nullable|array',
            'mentions.*' => 'uuid',
            'parent_id' => 'nullable|uuid',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $user = Auth::user();

        // parent_id 必须属于同一 thread
        if ($request->parent_id) {
            $parent = ReviewComment::where('thread_id', $threadId)
                ->where('id', $request->parent_id)
                ->first();
            if (!$parent) {
                return response()->json(['errors' => ['parent_id' => 'Parent comment not found in this thread']], 422);
            }
        }

        $comment = ReviewComment::create([
            'thread_id' => $thread->id,
            'user_id'   => $user->id,
            'parent_id' => $request->parent_id,
            'content'   => $request->content,
            'mentions'  => $request->mentions ?? [],
        ]);

        $comment->load('user');

        return response()->json(['data' => $comment], 201);
    }

    /**
     * 删除评论（软删除）
     * DELETE /api/comments/{commentId}
     */
    public function deleteComment(int $commentId): JsonResponse
    {
        $comment = ReviewComment::findOrFail($commentId);

        // 只能删除自己的评论
        if ($comment->user_id !== Auth::id()) {
            return response()->json(['error' => 'Forbidden'], 403);
        }

        $comment->update(['is_deleted' => true]);

        return response()->json(null, 204);
    }

    /**
     * 获取指定时间范围的 Threads（用于播放器时间轴渲染）
     * GET /api/assets/{assetId}/versions/{versionId}/threads?from=10&to=30
     */
    public function threadsInRange(Request $request, int $assetId, int $versionId): JsonResponse
    {
        $version = AssetVersion::where('asset_id', $assetId)
            ->where('id', $versionId)
            ->firstOrFail();

        $from = (float) $request->query('from', 0);
        $to   = (float) $request->query('to', PHP_FLOAT_MAX);

        $threads = $version->threads()
            ->with(['comments' => fn($q) => $q->with('user')->orderBy('created_at')])
            ->whereBetween('timecode_seconds', [$from, $to])
            ->orderBy('timecode_seconds')
            ->get()
            ->append(['is_resolved']);

        return response()->json(['data' => $threads]);
    }
}
