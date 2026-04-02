<div class="flex h-full gap-4">
    {{-- 侧边栏：文件夹树 --}}
    <div class="w-56 flex-shrink-0 flex flex-col bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">

        {{-- 根目录 --}}
        <button
            wire:click="enterFolder(null)"
            class="flex items-center gap-2 px-3 py-2.5 text-sm font-medium rounded-none
                   {{ is_null($currentFolderId) ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border-r-2 border-indigo-500' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700' }}"
        >
            <svg class="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/>
            </svg>
            全部项目
        </button>

        <div class="flex-1 overflow-y-auto py-2">
            <div class="px-3 pb-1">
                <span class="text-xs font-semibold text-gray-400 uppercase tracking-wider">文件夹</span>
            </div>

            {{-- 递归渲染文件夹树 --}}
            @each('livewire.folder-tree-item', $folderTree, 'folder')
        </div>

        {{-- 新建文件夹按钮 --}}
        <div class="p-3 border-t border-gray-100 dark:border-gray-700">
            <button
                wire:click="openCreateIn(null)"
                class="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-xl transition-colors"
            >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
                </svg>
                新建文件夹
            </button>
        </div>
    </div>

    {{-- 主内容区 --}}
    <div class="flex-1 flex flex-col min-w-0">

        {{-- 面包屑 + 操作栏 --}}
        <div class="flex items-center justify-between mb-4">
            {{-- 面包屑 --}}
            <nav class="flex items-center gap-1.5 text-sm">
                <button
                    wire:click="enterFolder(null)"
                    class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/>
                    </svg>
                </button>

                @forelse ($this->breadcrumbs as $crumb)
                    <svg class="w-4 h-4 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
                    </svg>
                    <button
                        wire:click="enterFolder('{{ $crumb->id }}')"
                        class="truncate max-w-32 text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors
                               {{ $loop->last ? 'font-medium text-gray-900 dark:text-white' : '' }}"
                    >
                        {{ $crumb->name }}
                    </button>
                @empty
                    <span class="font-medium text-gray-900 dark:text-white">根目录</span>
                @endforelse
            </nav>

            {{-- 操作按钮 --}}
            <div class="flex items-center gap-2">
                <button
                    wire:click="openCreateIn($currentFolderId)"
                    class="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-colors"
                >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
                    </svg>
                    新建文件夹
                </button>
            </div>
        </div>

        {{-- 当前目录的子文件夹列表 --}}
        @if($currentFolder?->children?->isNotEmpty() || ($currentFolder === null && $folderTree->isNotEmpty()))
            <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-6">
                {{-- 返回上级（如果有父目录） --}}
                @if($currentFolder?->parent)
                    <button
                        wire:click="enterFolder('{{ $currentFolder->parent->id }}')"
                        class="flex flex-col items-center gap-2 p-4 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-600 hover:border-indigo-300 dark:hover:border-indigo-600 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-all group"
                    >
                        <svg class="w-8 h-8 text-gray-400 group-hover:text-indigo-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M11 17l-5-5m0 0l5-5m-5 5h12"/>
                        </svg>
                        <span class="text-xs text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300">返回上级</span>
                    </button>
                @endif

                {{-- 当前目录的子文件夹 --}}
                @foreach($currentFolder?->children ?? $folderTree as $folder)
                    <div
                        wire:click="enterFolder('{{ $folder->id }}')"
                        class="group flex flex-col items-center gap-2 p-4 rounded-2xl border border-gray-100 dark:border-gray-700 hover:border-indigo-200 dark:hover:border-indigo-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 hover:shadow-sm transition-all cursor-pointer"
                    >
                        <div class="relative">
                            <svg class="w-10 h-10 text-amber-400 group-hover:text-amber-500 transition-colors" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h6l2 2h6a2 2 0 012 2v9a2 2 0 01-2 2z"/>
                            </svg>
                            @if($folder->children?->isNotEmpty())
                                <span class="absolute -top-1 -right-1 w-3 h-3 bg-indigo-500 rounded-full text-[8px] text-white flex items-center justify-center">
                                    {{ $folder->children->count() }}
                                </span>
                            @endif
                        </div>
                        <span class="text-xs font-medium text-gray-700 dark:text-gray-200 text-center truncate w-full group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                            {{ $folder->name }}
                        </span>
                        <span class="text-[10px] text-gray-400">{{ $folder->assets_count ?? $folder->assets()->count() }} 项</span>
                    </div>
                @endforeach
            </div>
        @endif

        {{-- 资产插槽 --}}
        <div class="flex-1">
            {{ $slot }}
        </div>
    </div>

    {{-- 新建文件夹弹窗 --}}
    @if ($showCreateModal)
        <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div x-on:click="$wire.showCreateModal = false" class="absolute inset-0 bg-black/50 backdrop-blur-sm"></div>
            <div @click.stop class="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-sm p-6">
                <h3 class="text-base font-semibold text-gray-900 dark:text-white mb-4">新建文件夹</h3>
                <form wire:submit="createFolder" class="space-y-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">文件夹名称</label>
                        <input type="text" wire:model="newFolderName" autofocus
                               class="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500">
                    </div>
                    <div class="flex gap-3">
                        <button type="button" wire:click="$set('showCreateModal', false)"
                                class="flex-1 px-4 py-2 text-sm text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition">取消</button>
                        <button type="submit"
                                class="flex-1 px-4 py-2 text-sm bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl transition">创建</button>
                    </div>
                </form>
            </div>
        </div>
    @endif

    {{-- 重命名弹窗 --}}
    @if ($showRenameModal && $renamingFolder)
        <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div x-on:click="$wire.showRenameModal = false" class="absolute inset-0 bg-black/50 backdrop-blur-sm"></div>
            <div @click.stop class="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-sm p-6">
                <h3 class="text-base font-semibold text-gray-900 dark:text-white mb-4">重命名文件夹</h3>
                <form wire:submit="renameFolder" class="space-y-4">
                    <div>
                        <input type="text" wire:model="renameFolderName"
                               class="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500">
                    </div>
                    <div class="flex gap-3">
                        <button type="button" wire:click="$set('showRenameModal', false)"
                                class="flex-1 px-4 py-2 text-sm text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition">取消</button>
                        <button type="submit"
                                class="flex-1 px-4 py-2 text-sm bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl transition">保存</button>
                    </div>
                </form>
            </div>
        </div>
    @endif

    {{-- 删除确认弹窗 --}}
    @if ($showDeleteModal && $deletingFolder)
        <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div x-on:click="$wire.showDeleteModal = false" class="absolute inset-0 bg-black/50 backdrop-blur-sm"></div>
            <div @click.stop class="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-sm p-6">
                <h3 class="text-base font-semibold text-red-600 dark:text-red-400 mb-2">确认删除</h3>
                <p class="text-sm text-gray-500 dark:text-gray-400 mb-4">
                    确定要删除文件夹「<strong>{{ $deletingFolder->name }}</strong>」吗？文件夹内的资产和子文件夹也会一并删除。
                </p>
                <div class="flex gap-3">
                    <button type="button" wire:click="$set('showDeleteModal', false)"
                            class="flex-1 px-4 py-2 text-sm text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition">取消</button>
                    <button type="button" wire:click="deleteFolder"
                            class="flex-1 px-4 py-2 text-sm bg-red-600 hover:bg-red-700 text-white font-medium rounded-xl transition">删除</button>
                </div>
            </div>
        </div>
    @endif
</div>
