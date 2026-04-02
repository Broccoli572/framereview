<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\Response;
use App\Models\ActivityLog;

/**
 * 自动记录关键操作的审计日志
 */
class AuditLog
{
    // 需要记录的操作（按路由名匹配）
    private const AUDITABLE_ACTIONS = [
        'api.projects.store',
        'api.projects.update',
        'api.projects.destroy',
        'api.folders.store',
        'api.folders.update',
        'api.folders.destroy',
        'api.assets.upload',
        'api.assets.destroy',
        'api.shares.store',
        'api.shares.update',
        'api.shares.revoke',
    ];

    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        $this->logIfNeeded($request, $response);

        return $response;
    }

    private function logIfNeeded(Request $request, Response $response): void
    {
        $routeName = $request->route()?->getName();

        if (! in_array($routeName, self::AUDITABLE_ACTIONS)) {
            return;
        }

        // 仅记录成功操作（2xx）
        if ($response->getStatusCode() >= 300) {
            return;
        }

        $user = $request->user();
        if (! $user) {
            return;
        }

        $workspaceId = $request->get('workspace_id');

        ActivityLog::create([
            'id'          => Str::uuid(),
            'user_id'     => $user->id,
            'workspace_id'=> $workspaceId,
            'action'      => $routeName,
            'resource_type' => $this->inferResourceType($routeName),
            'resource_id' => $this->inferResourceId($request, $response),
            'metadata'    => [
                'method'  => $request->method(),
                'path'    => $request->path(),
                'ip'      => $request->ip(),
            ],
        ]);
    }

    private function inferResourceType(string $routeName): string
    {
        return match (true) {
            str_contains($routeName, 'projects') => 'project',
            str_contains($routeName, 'folders')  => 'folder',
            str_contains($routeName, 'assets')   => 'asset',
            str_contains($routeName, 'shares')    => 'share',
            default => 'unknown',
        };
    }

    private function inferResourceId(Request $request, Response $response): ?string
    {
        // 优先从路由参数获取
        if ($id = $request->route('id')) {
            return $id;
        }

        // 从响应 body 解析（简单实现）
        $content = $response->getContent();
        if ($content && str_contains($content, '"id"')) {
            preg_match('/"id":"([^"]+)"/', $content, $m);
            return $m[1] ?? null;
        }

        return null;
    }
}
