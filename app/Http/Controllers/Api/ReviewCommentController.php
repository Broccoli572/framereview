<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ReviewComment;
use App\Models\ReviewThread;
use App\Services\NotificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Validator;

class ReviewCommentController extends Controller
{
    public function __construct(
        private NotificationService $notificationService
    ) {}

    /**
     * 添加评论（回复）
     * POST /api/threads/{threadId}/comments
     */
    public function store(Request $request, int $threadId): JsonResponse
    {
        $thread = ReviewThread::findOrFail($threadId);

        $validator = Validator::make($request->all(), [
            'content'    => 'required|string|max:5000',
            'mentions'   => 'nullable|array',
            'mentions.*' => 'uuid',
            'parent_id'  => 'nullable|uuid',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        // parent_id 必须属于同一 thread
        if ($request->parent_id) {
            $parent = ReviewComment::where('thread_id', $threadId)
                ->where('id', $request->parent_id)
                ->first();

            if (!$parent) {
                return response()->json(
                    ['errors' => ['parent_id' => 'Parent comment not found in this thread']],
                    422
                );
            }
        }

        $comment = ReviewComment::create([
            'thread_id' => $thread->id,
            'user_id'   => Auth::id(),
            'parent_id' => $request->parent_id,
            'content'   => $request->content,
            'mentions'  => $request->mentions ?? [],
        ]);

        $comment->load('user');

        // 发送 @提及 通知
        if (!empty($request->mentions)) {
            $this->notificationService->notifyMentionedUsers($comment, $request->mentions);
        }

        return response()->json(['data' => $comment], 201);
    }

    /**
     * 删除评论（软删除）
     * DELETE /api/comments/{commentId}
     */
    public function destroy(int $commentId): JsonResponse
    {
        $comment = ReviewComment::findOrFail($commentId);

        if ($comment->user_id !== Auth::id()) {
            return response()->json(['error' => 'Forbidden'], 403);
        }

        $comment->update(['is_deleted' => true]);

        return response()->json(null, 204);
    }

    /**
     * 解析 Thread（将 Thread 标记为 resolved）
     * PATCH /api/comments/{commentId}/resolve
     */
    public function resolve(Request $request, int $commentId): JsonResponse
    {
        $comment = ReviewComment::findOrFail($commentId);
        $thread  = $comment->thread;
        $user    = Auth::user();

        $thread->markResolved($user->id);

        // 通知所有参与者
        $this->notificationService->notifyThreadResolved($thread, $user);

        return response()->json(['data' => $thread->append(['is_resolved'])]);
    }
}
