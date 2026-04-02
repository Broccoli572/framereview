<?php

namespace App\Livewire;

use Livewire\Component;

class SearchResults extends Component
{
    public string $query = '';
    public ?string $workspaceId = null;

    public array $assets = [];
    public array $projects = [];
    public bool $isSearching = false;

    protected $listeners = [
        'globalSearch' => 'performSearch',
    ];

    public function performSearch(string $query, ?string $workspaceId = null): void
    {
        $this->query = $query;
        $this->workspaceId = $workspaceId;
        $this->isSearching = true;

        $response = \Illuminate\Support\Facades\Http::withToken(
            \Illuminate\Support\Facades\Auth::user()?->currentAccessToken()?->token ?? ''
        )->get(
            config('app.url') . '/api/search',
            [
                'q'           => $query,
                'workspace_id' => $workspaceId,
                'limit'       => 20,
            ]
        );

        if ($response->successful()) {
            $data = $response->json('data', []);
            $this->assets = $data['assets'] ?? [];
            $this->projects = $data['projects'] ?? [];
        }

        $this->isSearching = false;
    }

    public function render()
    {
        return view('livewire.search-results');
    }
}
