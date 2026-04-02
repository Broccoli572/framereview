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

class ReviewThreadController extends Controller
{
    /**
     * 获取版本的全部 Threads（含评论数、是否已解析）
     * GET /api/assets/{assetId}/versions/{versionId}/threads
     */
    public function index(int $assetId, int $versionId): JsonResponse
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
     * 创建 Thread（含第一条评论）
     * POST /api/assets/{assetId}/versions/{versionId}/threads
     */
    public function store(Request $request, int $assetId, int $versionId): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'type'             => 'required|in:timecode,frame,area',
            'timecode_seconds' => 'required_unless:type,area|nullable|numeric|min:0',
            'frame_number'     => 'required_if:type,frame|nullable|integer|min:0',
            'area_coordinates' => 'required_if:type,area|nullable|array',
            'comment'          => 'required|string|max:5000',
            'mentions'         => 'nullable|array',
            'mentions.*'       => 'uuid',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $version = AssetVersion::where('asset_id', $assetId)
            ->where('id', $versionId)
            ->firstOrFail();

        $thread = ReviewThread::create([
            'asset_version_id'  => $version->id,
            'type'              => $request->type,
            'timecode_seconds'  => $request->timecode_seconds,
            'frame_number'      => $request->frame_number,
            'area_coordinates'  => $request->area_coordinates,
            'status'            => ReviewThread::STATUS_OPEN,
        ]);

        $comment = ReviewComment::create([
            'thread_id' => $thread->id,
            'user_id'   => Auth::id(),
            'content'   => $request->comment,
            'mentions'  => $request->mentions ?? [],
        ]);

        $thread->load(['comments' => fn($q) => $q->with('user')->orderBy('created_at')]);
        $thread->loadCount('comments');

        return response()->json(['data' => $thread->append(['is_resolved'])], 201);
    }

    /**
     * 获取单个 Thread
     * GET /api/threads/{threadId}
     */
    public function show(int $threadId): JsonResponse
    {
        $thread = ReviewThread::with([
            'comments' => fn($q) => $q->with('user')->orderBy('created_at'),
            'resolvedBy',
        ])
            ->withCount('comments')
            ->findOrFail($threadId);

        return response()->json(['data' => $thread->append(['is_resolved'])]);
    }

    /**
     * 更新 Thread 状态（resolved / confirmed / reopen）
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

        if ($request->status === ReviewThread::STATUS_RESOLVED) {
            $thread->update([
                'status'      => ReviewThread::STATUS_RESOLVED,
                'resolved_by' => Auth::id(),
                'resolved_at' => now(),
            ]);
        } elseif ($request->status === ReviewThread::STATUS_OPEN) {
            $thread->update([
                'status'      => ReviewThread::STATUS_OPEN,
                'resolved_by' => null,
                'resolved_at' => null,
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

    /**
     * 获取指定时间范围的 Threads（播放器时间轴渲染）
     * GET /api/assets/{assetId}/versions/{versionId}/threads/in-range?from=10&to=30
     */
    public function inRange(Request $request, int $assetId, int $versionId): JsonResponse
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
