<?php

namespace App\Livewire;

use Livewire\Component;
use App\Models\Folder;
use App\Models\Project;
use Illuminate\Support\Collection;

class FolderBrowser extends Component
{
    public Project $project;

    /** 当前查看的文件夹 ID（null = 根目录） */
    public ?string $currentFolderId = null;

    /** 当前文件夹对象 */
    public ?Folder $currentFolder = null;

    /** 文件夹树（侧边栏） */
    public Collection $folderTree;

    /** 是否显示新建弹窗 */
    public bool $showCreateModal = false;
    public string $newFolderName = '';
    public ?string $newFolderParentId = null;

    /** 是否显示重命名弹窗 */
    public bool $showRenameModal = false;
    public ?Folder $renamingFolder = null;
    public string $renameFolderName = '';

    /** 是否显示删除确认 */
    public bool $showDeleteModal = false;
    public ?Folder $deletingFolder = null;

    public function mount(Project $project, ?string $currentFolderId = null)
    {
        $this->project = $project;
        $this->currentFolderId = $currentFolderId;
        $this->loadFolderTree();
        $this->loadCurrentFolder();
    }

    public function loadFolderTree(): void
    {
        // 加载项目根级文件夹（含递归子目录）
        $this->folderTree = Folder::where('project_id', $this->project->id)
            ->whereNull('parent_id')
            ->with('allDescendants')
            ->orderBy('name')
            ->get();
    }

    public function loadCurrentFolder(): void
    {
        $this->currentFolder = $this->currentFolderId
            ? Folder::with(['parent', 'children', 'assets'])
                ->where('project_id', $this->project->id)
                ->find($this->currentFolderId)
            : null;
    }

    /**
     * 进入某个文件夹
     */
    public function enterFolder(?string $folderId): void
    {
        $this->currentFolderId = $folderId;
        $this->loadCurrentFolder();
        $this->dispatch('folder:changed', folderId: $folderId);
    }

    /**
     * 获取当前面包屑
     */
    public function getBreadcrumbsProperty(): array
    {
        if (! $this->currentFolder) {
            return [];
        }

        return $this->currentFolder->breadcrumbs();
    }

    /**
     * 创建文件夹
     */
    public function createFolder(): void
    {
        $this->validate([
            'newFolderName' => ['required', 'string', 'max:255'],
        ]);

        Folder::create([
            'project_id' => $this->project->id,
            'parent_id'  => $this->newFolderParentId,
            'name'      => $this->newFolderName,
            'created_by'=> auth()->id(),
        ]);

        $this->newFolderName = '';
        $this->newFolderParentId = null;
        $this->showCreateModal = false;

        $this->loadFolderTree();
        $this->dispatch('folder:created');
    }

    /**
     * 准备重命名
     */
    public function prepareRename(Folder $folder): void
    {
        $this->renamingFolder = $folder;
        $this->renameFolderName = $folder->name;
        $this->showRenameModal = true;
    }

    /**
     * 执行重命名
     */
    public function renameFolder(): void
    {
        $this->validate(['renameFolderName' => ['required', 'string', 'max:255']]);

        $this->renamingFolder->update(['name' => $this->renameFolderName]);

        $this->showRenameModal = false;
        $this->renamingFolder = null;
        $this->renameFolderName = '';

        $this->loadFolderTree();
        if ($this->currentFolder) {
            $this->loadCurrentFolder();
        }
    }

    /**
     * 准备删除
     */
    public function prepareDelete(Folder $folder): void
    {
        $this->deletingFolder = $folder;
        $this->showDeleteModal = true;
    }

    /**
     * 执行删除（软删除）
     */
    public function deleteFolder(): void
    {
        if ($this->deletingFolder && $this->deletingFolder->project_id === $this->project->id) {
            $isCurrent = $this->currentFolderId === $this->deletingFolder->id;
            $this->deletingFolder->delete();
            $this->showDeleteModal = false;
            $this->deletingFolder = null;

            $this->loadFolderTree();

            if ($isCurrent) {
                $this->enterFolder(null);
            }
        }
    }

    /**
     * 在指定 parent 下打开新建弹窗
     */
    public function openCreateIn(?string $parentId): void
    {
        $this->newFolderParentId = $parentId;
        $this->showCreateModal = true;
    }

    public function render()
    {
        return view('livewire.folder-browser');
    }
}
