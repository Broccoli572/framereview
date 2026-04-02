<?php

namespace App\Console\Commands;

use App\Models\Asset;
use App\Models\Project;
use App\Services\SearchService;
use Illuminate\Console\Command;

class SearchReindex extends Command
{
    protected $signature = 'search:reindex {--assets-only} {--projects-only}';

    protected $description = '重建 Meilisearch 全文搜索索引';

    public function __construct(
        private SearchService $searchService
    ) {
        parent::__construct();
    }

    public function handle(): int
    {
        $this->info('开始重建搜索索引...');

        // 初始化索引
        if (!$this->option('projects-only')) {
            $this->info('初始化 Assets 索引...');
            $this->searchService->initAssetsIndex();
        }

        if (!$this->option('assets-only')) {
            $this->info('初始化 Projects 索引...');
            $this->searchService->initProjectsIndex();
        }

        // 索引 Projects
        if (!$this->option('assets-only')) {
            $this->info('索引 Projects...');
            $projects = Project::with('workspace')->get();
            foreach ($projects->chunk(100) as $chunk) {
                foreach ($chunk as $project) {
                    $this->searchService->indexProject($project);
                }
                $this->output->write('.');

                // 给 Meilisearch 喘息时间
                usleep(100000); // 100ms
            }
            $this->info(' [' . $projects->count() . ']');
        }

        // 索引 Assets
        if (!$this->option('projects-only')) {
            $this->info('索引 Assets...');
            $assets = Asset::with(['project.workspace'])->get();
            foreach ($assets->chunk(100) as $chunk) {
                $this->searchService->indexAssets($chunk->all());
                $this->output->write('.');

                usleep(100000);
            }
            $this->info(' [' . $assets->count() . ']');
        }

        $this->info("\n索引重建完成 ✓");

        return Command::SUCCESS;
    }
}
