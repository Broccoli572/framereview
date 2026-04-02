<div>
    {{-- 页面标题 + 新建按钮 --}}
    <div class="flex items-center justify-between mb-6">
        <div>
            <h1 class="text-2xl font-bold text-gray-900 dark:text-white">
                {{ $workspace->name }}
            </h1>
            <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {{ $projects->total() }} 个项目
            </p>
        </div>

        <button
            x-on:click="$wire.showCreateModal = true"
            class="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-xl transition-colors shadow-sm"
        >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
            </svg>
            新建项目
        </button>
    </div>

    {{-- 项目卡片网格 --}}
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        @forelse ($projects as $project)
            <div class="group bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 hover:border-indigo-200 dark:hover:border-indigo-700 transition-all duration-200 hover:shadow-md hover:shadow-indigo-100 dark:hover:shadow-indigo-900/20 overflow-hidden">

                {{-- 封面 --}}
                <div class="aspect-video bg-gradient-to-br from-gray-100 to-gray-50 dark:from-gray-700 dark:to-gray-800 relative overflow-hidden">
                    @if ($project->cover)
                        <img src="{{ $project->cover }}" alt="" class="w-full h-full object-cover">
                    @else
                        <div class="absolute inset-0 flex items-center justify-center">
                            <svg class="w-12 h-12 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                                    d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z"/>
                            </svg>
                        </div>
                    @endif

                    {{-- 状态标签 --}}
                    <div class="absolute top-3 right-3">
                        <span class="px-2 py-0.5 text-xs font-medium rounded-full
                            @if($project->status === 'active')
                                bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300
                            @else
                                bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400
                            @endif">
                            {{ $project->status === 'active' ? '进行中' : '已归档' }}
                        </span>
                    </div>
                </div>

                {{-- 内容 --}}
                <div class="p-4">
                    <h3 class="font-semibold text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors truncate">
                        {{ $project->name }}
                    </h3>
                    @if ($project->description)
                        <p class="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                            {{ $project->description }}
                        </p>
                    @endif

                    <div class="flex items-center gap-4 mt-3 text-xs text-gray-400">
                        <span class="flex items-center gap-1">
                            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                            </svg>
                            {{ $project->assets_count ?? 0 }} 个资产
                        </span>
                        <span>{{ $project->created_at->diffForHumans() }}</span>
                    </div>
                </div>

                {{-- 操作菜单 --}}
                <div class="px-4 pb-3 flex gap-2">
                    <a href="{{ route('projects.show', $project) }}"
                       class="flex-1 text-center py-1.5 text-sm text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors">
                        打开
                    </a>
                    <button wire:click="deleteProject({{ $project->id }})"
                            class="px-3 py-1.5 text-sm text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
                        删除
                    </button>
                </div>
            </div>
        @empty
            <div class="col-span-full flex flex-col items-center justify-center py-16 text-center">
                <div class="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
                    <svg class="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                            d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/>
                    </svg>
                </div>
                <p class="text-gray-500 dark:text-gray-400 font-medium">暂无项目</p>
                <p class="text-sm text-gray-400 mt-1">点击上方按钮创建第一个项目</p>
            </div>
        @endforelse
    </div>

    {{-- 分页 --}}
    @if ($projects->hasPages())
        <div class="mt-6">
            {{ $projects->links() }}
        </div>
    @endif

    {{-- 新建项目弹窗 --}}
    @if ($showCreateModal)
        <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div x-on:click="$wire.showCreateModal = false"
                 class="absolute inset-0 bg-black/50 backdrop-blur-sm"></div>

            <div @click.stop class="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md p-6">
                <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">新建项目</h2>

                <form wire:submit="createProject" class="space-y-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            项目名称 <span class="text-red-500">*</span>
                        </label>
                        <input type="text" wire:model="name"
                               class="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-600
                                      bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                                      focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                               placeholder="例如：产品宣传片 2026Q2" autofocus>
                        @error('name')
                            <p class="mt-1 text-sm text-red-500">{{ $message }}</p>
                        @enderror
                    </div>

                    <div>
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            项目描述
                        </label>
                        <textarea wire:model="description" rows="3"
                                  class="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-600
                                         bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                                         focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition resize-none"
                                  placeholder="简要描述项目内容（可选）"></textarea>
                    </div>

                    <div class="flex gap-3 pt-2">
                        <button type="button" wire:click="$set('showCreateModal', false)"
                                class="flex-1 px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition">
                            取消
                        </button>
                        <button type="submit"
                                class="flex-1 px-4 py-2 text-sm bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl transition">
                            创建项目
                        </button>
                    </div>
                </form>
            </div>
        </div>
    @endif
</div>
