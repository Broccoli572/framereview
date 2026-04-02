<div class="search-results">

    {{-- 搜索结果头部 --}}
    <div class="mb-4">
        <p class="text-sm text-neutral-400">
            @if($isSearching)
                <span class="animate-pulse">搜索中...</span>
            @else
                @if($query)
                    <span>"{{ $query }}"</span> 的搜索结果
                    <span class="ml-1">({{ count($assets) + count($projects) }} 条)</span>
                @else
                    输入关键词开始搜索
                @endif
            @endif
        </p>
    </div>

    @if(!$isSearching && $query)

        {{-- 项目结果 --}}
        @if(count($projects) > 0)
            <div class="mb-6">
                <h4 class="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-2">项目</h4>
                <div class="space-y-1">
                    @foreach($projects as $project)
                        <a
                            href="/projects/{{ $project['id'] }}"
                            class="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-neutral-800 transition-colors group"
                        >
                            <div class="w-8 h-8 rounded bg-blue-900/50 flex items-center justify-center flex-shrink-0">
                                <svg class="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                        d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"/>
                                </svg>
                            </div>
                            <div class="flex-1 min-w-0">
                                <p class="text-sm font-medium text-white group-hover:text-blue-400 truncate">
                                    {{ $project['name'] }}
                                </p>
                                <p class="text-xs text-neutral-500 truncate">
                                    {{ $project['workspace_name'] ?? '' }}
                                </p>
                            </div>
                        </a>
                    @endforeach
                </div>
            </div>
        @endif

        {{-- 资产结果 --}}
        @if(count($assets) > 0)
            <div>
                <h4 class="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-2">资产</h4>
                <div class="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                    @foreach($assets as $asset)
                        <a
                            href="/assets/{{ $asset['id'] }}"
                            class="group block bg-neutral-800/50 hover:bg-neutral-800 rounded-lg overflow-hidden transition-colors"
                        >
                            {{-- 缩略图占位 --}}
                            <div class="aspect-video bg-neutral-800 flex items-center justify-center">
                                @if(in_array($asset['type'], ['video']))
                                    <svg class="w-8 h-8 text-neutral-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                                            d="M15 10l4.553-2.069A1 1 0 0121 8.879v6.242a1 1 0 01-1.447.889L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z"/>
                                    </svg>
                                @elseif(in_array($asset['type'], ['image']))
                                    <svg class="w-8 h-8 text-neutral-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                                            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                                    </svg>
                                @else
                                    <svg class="w-8 h-8 text-neutral-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                                            d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"/>
                                    </svg>
                                @endif
                            </div>
                            <div class="p-2">
                                <p class="text-xs font-medium text-white truncate group-hover:text-blue-400">
                                    {{ $asset['name'] }}
                                </p>
                                <p class="text-[10px] text-neutral-500 mt-0.5">
                                    {{ $asset['project_name'] ?? '' }}
                                </p>
                            </div>
                        </a>
                    @endforeach
                </div>
            </div>
        @endif

        {{-- 无结果 --}}
        @if(empty($assets) && empty($projects))
            <div class="py-12 text-center">
                <svg class="w-12 h-12 mx-auto text-neutral-600 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                </svg>
                <p class="text-sm text-neutral-400">未找到与 "{{ $query }}" 相关的结果</p>
                <p class="text-xs text-neutral-600 mt-1">试试其他关键词</p>
            </div>
        @endif

    @endif
</div>
