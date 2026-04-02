{{-- 递归文件夹树节点 --}}
{{-- $folder 来自 FolderBrowser::loadFolderTree() 的递归加载 --}}
<div x-data="{ open: false }" class="select-none">
    {{-- 节点行 --}}
    <div class="flex items-center group">
        {{-- 展开箭头 --}}
        @if($folder->children?->isNotEmpty())
            <button
                x-on:click="open = !open"
                class="flex-shrink-0 w-5 h-5 flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
                <svg :class="open ? 'rotate-90' : ''" class="w-3 h-3 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
                </svg>
            </button>
        @else
            <div class="w-5 flex-shrink-0"></div>
        @endif

        {{-- 文件夹名称 --}}
        <button
            wire:click="$parent.enterFolder('{{ $folder->id }}')"
            class="flex-1 flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-sm truncate
                   {{ $folder->id == $currentFolderId
                       ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 font-medium'
                       : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700' }}"
        >
            <svg class="w-4 h-4 flex-shrink-0 text-amber-400" fill="currentColor" viewBox="0 0 24 24">
                <path d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h6l2 2h6a2 2 0 012 2v9a2 2 0 01-2 2z"/>
            </svg>
            <span class="truncate">{{ $folder->name }}</span>
        </button>

        {{-- 操作菜单 --}}
        <div class="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity flex gap-0.5">
            <button
                wire:click="$parent.prepareRename({{ $folder->id }})"
                class="p-1 rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                title="重命名"
            >
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/>
                </svg>
            </button>
            <button
                wire:click="$parent.prepareDelete({{ $folder->id }})"
                class="p-1 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
                title="删除"
            >
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                </svg>
            </button>
        </div>
    </div>

    {{-- 子节点（递归） --}}
    @if($folder->children?->isNotEmpty())
        <div x-show="open" x-collapse class="ml-3 pl-2 border-l border-gray-100 dark:border-gray-700">
            @each('livewire.folder-tree-item', $folder->children, 'folder')
        </div>
    @endif
</div>
