<?php

namespace App\Livewire\Projects;

use Livewire\Component;
use Livewire\WithPagination;
use App\Models\Project;
use App\Models\Workspace;

class Index extends Component
{
    use WithPagination;

    public Workspace $workspace;
    public bool $showCreateModal = false;
    public string $name = '';
    public string $description = '';

    public function mount(Workspace $workspace)
    {
        $this->workspace = $workspace;
    }

    public function getProjectsProperty()
    {
        return Project::where('workspace_id', $this->workspace->id)
            ->withCount('assets')
            ->orderByDesc('created_at')
            ->paginate(12);
    }

    public function createProject(): void
    {
        $this->validate([
            'name' => ['required', 'string', 'max:255'],
        ]);

        Project::create([
            'workspace_id' => $this->workspace->id,
            'name'        => $this->name,
            'description' => $this->description ?: null,
        ]);

        $this->name = '';
        $this->description = '';
        $this->showCreateModal = false;

        $this->resetPage();
    }

    public function deleteProject(string $projectId): void
    {
        Project::findOrFail($projectId)->delete();
    }

    public function render()
    {
        return view('livewire.projects.index', [
            'projects' => $this->projects,
        ]);
    }
}
