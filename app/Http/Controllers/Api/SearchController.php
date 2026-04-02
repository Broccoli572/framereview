<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\SearchService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SearchController extends Controller
{
    public function __construct(
        private SearchService $searchService
    ) {}

    /**
     * 全局搜索（资产 + 项目）
     * GET /api/search?q=keyword&workspace_id=xxx&limit=20
     */
    public function search(Request $request): JsonResponse
    {
        $query = trim($request->query('q', ''));

        if (mb_strlen($query) < 2) {
            return response()->json(['data' => ['assets' => [], 'projects' => []]]);
        }

        $workspaceId = $request->query('workspace_id');
        $limit = min((int) $request->query('limit', 20), 50);

        $results = $this->searchService->search($query, $workspaceId, $limit);

        return response()->json(['data' => $results]);
    }
}
