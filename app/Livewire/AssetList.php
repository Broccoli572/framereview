<?php

namespace App\Livewire;

use Livewire\Component;
use Livewire\WithPagination;
use App\Models\Asset;
use App\Models\Folder;
use App\Models\Project;
use Illuminate\Support\Facades\Storage;

class AssetList extends Component
{
    use WithPagination;

    public Project $project;
    public ?Folder $folder = null;

    /** 筛选与排序 */
    public string $typeFilter = '';
    public string $statusFilter = '';
    public string $sortField = 'created_at';
    public string $sortDir = 'desc';
    public string $search = '';

    /** 批量选择 */
    public array $selected = [];
    public bool $selectAll = false;

    /** 当前预览的资产 */
    public ?Asset $previewing = null;

    protected $queryString = [
        'typeFilter'  => ['except' => ''],
        'statusFilter'=> ['except' => ''],
        'sortField'   => ['except' => 'created_at'],
        'sortDir'     => ['except' => 'desc'],
        'search'      => ['except' => ''],
    ];

    public function mount(Project $project, ?Folder $folder = null)
    {
        $this->project = $project;
        $this->folder = $folder;
    }

    public function getAssetsProperty()
    {
        $query = Asset::query()
            ->where('project_id', $this->project->id)
            ->when($this->folder, fn ($q) => $q->where('folder_id', $this->folder->id))
            ->when(! $this->folder, fn ($q) => $q->whereNull('folder_id'))
            ->when($this->typeFilter, fn ($q) => $q->where('type', $this->typeFilter))
            ->when($this->statusFilter, fn ($q) => $q->where('status', $this->statusFilter))
            ->when($this->search, fn ($q) => $q->where('name', 'like', '%' . $this->search . '%'))
            ->with(['currentVersion', 'previews', 'creator']);

        return $query->orderBy($this->sortField, $this->sortDir)->paginate(30);
    }

    public function updatedSelectAll($value): void
    {
        if ($value) {
            $this->selected = $this->assets->pluck('id')->map(fn ($id) => (string) $id)->toArray();
        } else {
            $this->selected = [];
        }
    }

    public function sortBy(string $field): void
    {
        if ($this->sortField === $field) {
            $this->sortDir = $this->sortDir === 'asc' ? 'desc' : 'asc';
        } else {
            $this->sortField = $field;
            $this->sortDir = 'desc';
        }
    }

    public function preview(Asset $asset): void
    {
        $this->previewing = $asset->load(['currentVersion', 'previews']);
    }

    public function closePreview(): void
    {
        $this->previewing = null;
    }

    public function deleteAsset(Asset $asset): void
    {
        $asset->delete();
    }

    public function deleteSelected(): void
    {
        Asset::whereIn('id', $this->selected)->delete();
        $this->selected = [];
        $this->selectAll = false;
    }

    public function moveSelected(string $targetFolderId): void
    {
        Asset::whereIn('id', $this->selected)->update(['folder_id' => $targetFolderId]);
        $this->selected = [];
        $this->selectAll = false;
    }

    public function getStreamUrl(Asset $asset): ?string
    {
        if (! $asset->isVideo() || ! $asset->isReady()) {
            return null;
        }

        $path = $asset->currentVersion?->storage_path ?? $asset->storage_path;
        return Storage::disk('s3')->temporaryUrl($path, now()->addMinutes(15));
    }

    public function render()
    {
        return view('livewire.asset-list', [
            'assets' => $this->assets,
        ]);
    }
}
