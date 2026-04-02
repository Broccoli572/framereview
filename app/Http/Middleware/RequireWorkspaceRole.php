<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * 校验用户在当前 Workspace 中的角色是否在允许列表中
 * 用法：->middleware('role:admin,member')
 */
class RequireWorkspaceRole
{
    public function handle(Request $request, Closure $next, ...$allowedRoles): Response
    {
        $user = $request->user();
        $workspaceId = $request->get('workspace_id');

        if (! $user || ! $workspaceId) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        $membership = $user->workspaceMemberships()
            ->where('workspace_id', $workspaceId)
            ->first();

        if (! $membership || ! in_array($membership->role, $allowedRoles)) {
            return response()->json(['message' => 'Forbidden: insufficient role'], 403);
        }

        // 将角色注入请求供后续使用
        $request->merge(['workspace_role' => $membership->role]);

        return $next($request);
    }
}
