<div>
    {{-- 工具栏 --}}
    <div class="flex items-center gap-3 mb-4 flex-wrap">
        {{-- 搜索 --}}
        <div class="relative flex-1 min-w-48">
            <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
            </svg>
            <input type="text" wire:model.live.debounce.300ms="search"
                   placeholder="搜索资产名称..."
                   class="w-full pl-9 pr-4 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent">
        </div>

        {{-- 类型筛选 --}}
        <select wire:model.live="typeFilter"
                class="px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-indigo-500">
            <option value="">全部类型</option>
            <option value="video">视频</option>
            <option value="audio">音频</option>
            <option value="image">图片</option>
            <option value="document">文档</option>
        </select>

        {{-- 状态筛选 --}}
        <select wire:model.live="statusFilter"
                class="px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-indigo-500">
            <option value="">全部状态</option>
            <option value="ready">就绪</option>
            <option value="processing">处理中</option>
            <option value="error">失败</option>
        </select>

        {{-- 批量操作 --}}
        @if(count($selected) > 0)
            <div class="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl">
                <span class="text-sm text-indigo-700 dark:text-indigo-300 font-medium">{{ count($selected) }} 项已选</span>
                <button wire:click="deleteSelected"
                        class="text-sm text-red-600 hover:text-red-700 dark:text-red-400 font-medium">
                    删除
                </button>
                <button wire:click="$set('selected', [])"
                        class="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400">
                    取消
                </button>
            </div>
        @endif
    </div>

    {{-- 资产表格 --}}
    <div class="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
        {{-- 表头 --}}
        <div class="grid grid-cols-[auto_1fr_auto_auto_auto_auto] gap-4 px-4 py-3 border-b border-gray-100 dark:border-gray-700 text-xs font-semibold text-gray-400 uppercase tracking-wider">
            <div class="flex items-center">
                <input type="checkbox" wire:model.live="selectAll" class="rounded border-gray-300 dark:border-gray-600 text-indigo-600 focus:ring-indigo-500">
            </div>
            <button wire:click="sortBy('name')" class="flex items-center gap-1 hover:text-gray-700 dark:hover:text-gray-200 transition-colors text-left">
                名称
                @if($sortField === 'name')
                    <span class="text-indigo-500">{{ $sortDir === 'asc' ? '↑' : '↓' }}</span>
                @endif
            </button>
            <div>类型</div>
            <button wire:click="sortBy('size_bytes')" class="flex items-center gap-1 hover:text-gray-700 dark:hover:text-gray-200 transition-colors">
                大小
                @if($sortField === 'size_bytes')
                    <span class="text-indigo-500">{{ $sortDir === 'asc' ? '↑' : '↓' }}</span>
                @endif
            </button>
            <button wire:click="sortBy('status')" class="hover:text-gray-700 dark:hover:text-gray-200 transition-colors">
                状态
            </button>
            <div>操作</div>
        </div>

        {{-- 资产行 --}}
        @forelse ($assets as $asset)
            <div class="grid grid-cols-[auto_1fr_auto_auto_auto_auto] gap-4 px-4 py-3 border-b border-gray-50 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors items-center group"
                 x-data="{ previewOpen: false }">

                {{-- 选择框 --}}
                <div>
                    <input type="checkbox" wire:model.live="selected" value="{{ $asset->id }}"
                           class="rounded border-gray-300 dark:border-gray-600 text-indigo-600 focus:ring-indigo-500">
                </div>

                {{-- 名称 + 缩略图 --}}
                <div class="flex items-center gap-3 min-w-0">
                    {{-- 缩略图 --}}
                    <div class="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-700 flex-shrink-0 overflow-hidden flex items-center justify-center">
                        @if($asset->type === 'video')
                            <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"/>
                            </svg>
                        @elseif($asset->type === 'image')
                            <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                            </svg>
                        @else
                            <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                            </svg>
                        @endif
                    </div>
                    <div class="min-w-0">
                        <p class="text-sm font-medium text-gray-900 dark:text-white truncate">{{ $asset->name }}</p>
                        <p class="text-xs text-gray-400">{{ $asset->created_at->diffForHumans() }}</p>
                    </div>
                </div>

                {{-- 类型 --}}
                <div class="text-xs text-gray-500 dark:text-gray-400">
                    @if($asset->type === 'video')
                        <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300">
                            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>
                            视频
                        </span>
                    @elseif($asset->type === 'audio')
                        <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-300">音频</span>
                    @elseif($asset->type === 'image')
                        <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-300">图片</span>
                    @else
                        <span class="px-2 py-0.5 rounded-full bg-gray-50 dark:bg-gray-700 text-gray-500">文档</span>
                    @endif
                </div>

                {{-- 大小 --}}
                <div class="text-xs text-gray-500 dark:text-gray-400 tabular-nums">
                    {{ number_format($asset->size_bytes / 1024 / 1024, 1) }} MB
                </div>

                {{-- 状态 --}}
                <div>
                    @if($asset->status === 'ready')
                        <span class="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-300">
                            <span class="w-1.5 h-1.5 rounded-full bg-green-500"></span>就绪
                        </span>
                    @elseif($asset->status === 'processing')
                        <span class="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-300">
                            <span class="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>处理中
                        </span>
                    @elseif($asset->status === 'error')
                        <span class="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-300">
                            <span class="w-1.5 h-1.5 rounded-full bg-red-500"></span>失败
                        </span>
                    @else
                        <span class="px-2 py-0.5 text-xs rounded-full bg-gray-50 dark:bg-gray-700 text-gray-400">待上传</span>
                    @endif
                </div>

                {{-- 操作 --}}
                <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    @if($asset->isVideo() && $asset->isReady())
                        <button wire:click="preview({{ $asset->id }})"
                                class="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors"
                                title="预览">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"/>
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                            </svg>
                        </button>
                    @endif
                    <button wire:click="deleteAsset({{ $asset->id }})"
                            wire:confirm="确定要删除「{{ $asset->name }}」吗？"
                            class="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
                            title="删除">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                        </svg>
                    </button>
                </div>
            </div>
        @empty
            <div class="flex flex-col items-center justify-center py-16 text-center">
                <div class="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center mb-4">
                    <svg class="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                    </svg>
                </div>
                <p class="text-gray-500 dark:text-gray-400 font-medium">暂无资产</p>
                <p class="text-sm text-gray-400 mt-1">拖拽文件到上方或点击上传</p>
            </div>
        @endforelse
    </div>

    {{-- 分页 --}}
    @if ($assets->hasPages())
        <div class="mt-4">
            {{ $assets->links() }}
        </div>
    @endif

    {{-- 视频预览弹窗 --}}
    @if ($previewing)
        <div class="fixed inset-0 z-50 flex items-center justify-center p-4" x-data="{ open: true }" x-on:keydown.escape.window="$wire.closePreview()">
            <div x-on:click="$wire.closePreview()" class="absolute inset-0 bg-black/80 backdrop-blur-sm"></div>
            <div class="relative bg-gray-900 rounded-2xl overflow-hidden shadow-2xl max-w-4xl w-full">
                <button x-on:click="$wire.closePreview()"
                        class="absolute top-4 right-4 z-10 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                    </svg>
                </button>
                <video controls autoplay class="w-full aspect-video" x-init="$el.play()">
                    <source src="{{ $this->getStreamUrl($previewing) }}" type="{{ $previewing->mime_type }}">
                    您的浏览器不支持视频播放
                </video>
                <div class="p-4">
                    <h3 class="text-white font-medium">{{ $previewing->name }}</h3>
                    <p class="text-gray-400 text-sm mt-1">
                        {{ number_format($previewing->size_bytes / 1024 / 1024, 1) }} MB
                        @if($previewing->duration)
                            · {{ gmdate('H:i:s', $previewing->duration) }}
                        @endif
                        @if($previewing->width && $previewing->height)
                            · {{ $previewing->width }}×{{ $previewing->height }}
                        @endif
                    </p>
                </div>
            </div>
        </div>
    @endif
</div>
