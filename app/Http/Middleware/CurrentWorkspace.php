<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * 将当前请求的 workspace_id 注入到请求中
 * 优先取 header X-Workspace-ID，其次 session，最后取用户第一个 workspace
 */
class CurrentWorkspace
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (! $user) {
            return $next($request);
        }

        $workspaceId = $request->header('X-Workspace-ID')
            ?? $request->session()->get('current_workspace_id')
            ?? $user->workspaceMemberships()->first()?->workspace_id;

        $request->merge(['workspace_id' => $workspaceId]);

        return $next($request);
    }
}
