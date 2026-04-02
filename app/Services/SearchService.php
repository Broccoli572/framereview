<?php

namespace App\Services;

use App\Models\Asset;
use App\Models\Project;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class SearchService
{
    private string $host;
    private string $apiKey;
    private string $indexPrefix;

    public const INDEX_ASSETS   = 'assets';
    public const INDEX_PROJECTS = 'projects';

    public function __construct()
    {
        $this->host       = env('MEILISEARCH_HOST', 'http://localhost:7700');
        $this->apiKey     = env('MEILISEARCH_KEY', 'changeme_search_key');
        $this->indexPrefix = env('MEILISEARCH_INDEX_PREFIX', 'framereview_');
    }

    private function index(string $name)
    {
        return $this->host . '/indexes/' . $this->indexPrefix . $name;
    }

    private function headers(): array
    {
        return [
            'Authorization' => "Bearer {$this->apiKey}",
            'Content-Type'  => 'application/json',
        ];
    }

    // ─── 索引初始化 ────────────────────────────────────────────────────────

    /**
     * 初始化 Assets 索引（可排序/可过滤）
     */
    public function initAssetsIndex(): void
    {
        $index = $this->index(self::INDEX_ASSETS);

        // 创建索引
        Http::withHeaders($this->headers())->put($this->host . '/indexes/' . $this->indexPrefix . self::INDEX_ASSETS, [
            'uid'   => $this->indexPrefix . self::INDEX_ASSETS,
            'name'  => 'Assets',
        ]);

        // 设置 searchable 属性
        Http::withHeaders($this->headers())->patch($index . '/settings', [
            'searchableAttributes' => ['name', 'description', 'tags', 'project_name', 'workspace_name'],
            'filterableAttributes' => ['workspace_id', 'project_id', 'type', 'status', 'tags', 'created_by'],
            'sortableAttributes'   => ['name', 'created_at', 'updated_at', 'size_bytes'],
            'displayedAttributes' => ['*'],
        ]);
    }

    /**
     * 初始化 Projects 索引
     */
    public function initProjectsIndex(): void
    {
        Http::withHeaders($this->headers())->put($this->host . '/indexes/' . $this->indexPrefix . self::INDEX_PROJECTS, [
            'uid'   => $this->indexPrefix . self::INDEX_PROJECTS,
            'name'  => 'Projects',
        ]);

        $index = $this->index(self::INDEX_PROJECTS);

        Http::withHeaders($this->headers())->patch($index . '/settings', [
            'searchableAttributes' => ['name', 'description', 'workspace_name'],
            'filterableAttributes' => ['workspace_id', 'created_by'],
            'sortableAttributes'   => ['name', 'created_at', 'updated_at'],
        ]);
    }

    // ─── 文档操作 ─────────────────────────────────────────────────────────

    /**
     * 索引单个 Asset
     */
    public function indexAsset(Asset $asset): void
    {
        $this->indexAssets([$asset]);
    }

    /**
     * 批量索引 Assets
     */
    public function indexAssets(array $assets): void
    {
        if (empty($assets)) {
            return;
        }

        $docs = collect($assets)->map(function (Asset $asset) {
            $project = $asset->project;
            $workspace = $project?->workspace;

            return [
                'id'            => $asset->id,
                'name'          => $asset->name,
                'description'   => $asset->description,
                'type'          => $asset->type,
                'status'        => $asset->status,
                'size_bytes'    => $asset->size_bytes,
                'tags'          => $asset->tags ?? [],
                'project_id'    => $asset->project_id,
                'project_name'  => $project?->name,
                'workspace_id'  => $workspace?->id,
                'workspace_name' => $workspace?->name,
                'created_by'    => $asset->created_by,
                'created_at'    => $asset->created_at?->timestamp,
                'updated_at'    => $asset->updated_at?->timestamp,
            ];
        })->toArray();

        try {
            Http::withHeaders($this->headers())
                ->post($this->index(self::INDEX_ASSETS) . '/documents', ['data' => $docs]);
        } catch (\Throwable $e) {
            Log::warning('Meilisearch indexAssets failed', [
                'count' => count($docs),
                'error' => $e->getMessage(),
            ]);
        }
    }

    /**
     * 索引 Project
     */
    public function indexProject(Project $project): void
    {
        $workspace = $project->workspace;

        $doc = [
            'id'             => $project->id,
            'name'           => $project->name,
            'description'    => $project->description,
            'workspace_id'   => $workspace?->id,
            'workspace_name' => $workspace?->name,
            'created_by'    => $project->created_by,
            'created_at'    => $project->created_at?->timestamp,
            'updated_at'    => $project->updated_at?->timestamp,
        ];

        try {
            Http::withHeaders($this->headers())
                ->post($this->index(self::INDEX_PROJECTS) . '/documents', ['data' => [$doc]]);
        } catch (\Throwable $e) {
            Log::warning('Meilisearch indexProject failed', [
                'project_id' => $project->id,
                'error'      => $e->getMessage(),
            ]);
        }
    }

    /**
     * 从索引中删除 Asset
     */
    public function deleteAsset(string $assetId): void
    {
        try {
            Http::withHeaders($this->headers())
                ->delete($this->index(self::INDEX_ASSETS) . '/documents/' . $assetId);
        } catch (\Throwable $e) {
            Log::warning('Meilisearch deleteAsset failed', ['asset_id' => $assetId]);
        }
    }

    /**
     * 删除 Project 索引
     */
    public function deleteProject(string $projectId): void
    {
        try {
            Http::withHeaders($this->headers())
                ->delete($this->index(self::INDEX_PROJECTS) . '/documents/' . $projectId);
        } catch (\Throwable $e) {
            Log::warning('Meilisearch deleteProject failed', ['project_id' => $projectId]);
        }
    }

    // ─── 搜索 ────────────────────────────────────────────────────────────

    /**
     * 全局搜索（资产 + 项目）
     */
    public function search(string $query, ?string $workspaceId = null, int $limit = 20): array
    {
        $filters = $workspaceId ? "workspace_id = \"{$workspaceId}\"" : null;

        $assets = $this->searchAssets($query, $filters, (int) ceil($limit / 2));
        $projects = $this->searchProjects($query, $filters, (int) floor($limit / 2));

        return [
            'assets'   => $assets,
            'projects' => $projects,
        ];
    }

    public function searchAssets(string $query, ?string $filter = null, int $limit = 10): array
    {
        return $this->doSearch(self::INDEX_ASSETS, $query, $filter, $limit);
    }

    public function searchProjects(string $query, ?string $filter = null, int $limit = 10): array
    {
        return $this->doSearch(self::INDEX_PROJECTS, $query, $filter, $limit);
    }

    private function doSearch(string $indexName, string $query, ?string $filter, int $limit): array
    {
        try {
            $body = [
                'q'      => $query,
                'limit'  => $limit,
                'offset' => 0,
            ];

            if ($filter) {
                $body['filter'] = $filter;
            }

            $response = Http::withHeaders($this->headers())
                ->post($this->index($indexName) . '/search', $body);

            if ($response->successful()) {
                return $response->json('hits', []);
            }

            Log::warning('Meilisearch search failed', [
                'index' => $indexName,
                'query' => $query,
                'status' => $response->status(),
            ]);
        } catch (\Throwable $e) {
            Log::error('Meilisearch connection error', [
                'index' => $indexName,
                'error' => $e->getMessage(),
            ]);
        }

        return [];
    }
}
