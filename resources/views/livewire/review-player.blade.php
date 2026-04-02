<div
    x-data="reviewPlayer()"
    x-init="init()"
    class="review-player bg-neutral-900 rounded-xl overflow-hidden"
    style="height: calc(100vh - 4rem);"
>

    {{-- 顶部工具栏 --}}
    <div class="flex items-center justify-between px-4 py-2 bg-neutral-800 border-b border-neutral-700">
        <div class="flex items-center gap-3">
            <span class="text-sm text-neutral-400">{{ $asset->name }}</span>
            @if($version)
                <span class="px-2 py-0.5 text-xs rounded bg-blue-900 text-blue-300">v{{ $version->version_number }}</span>
            @endif
        </div>
        <div class="flex items-center gap-2">
            <button
                wire:click="startNewThread"
                class="px-3 py-1.5 text-xs font-medium rounded-lg transition-colors"
                :class="'bg-blue-600 hover:bg-blue-500 text-white'"
            >
                + 添加评论
            </button>
            <button
                wire:click="$set('showThreadList', !showThreadList)"
                class="relative px-3 py-1.5 text-xs rounded-lg transition-colors"
                :class="showThreadList ? 'bg-neutral-700 text-white' : 'bg-neutral-700 hover:bg-neutral-600 text-neutral-300'"
            >
                全部评论
                @if($openThreadsCount > 0)
                    <span class="absolute -top-1 -right-1 w-4 h-4 text-[10px] font-bold bg-red-500 rounded-full text-white flex items-center justify-center">
                        {{ $openThreadsCount }}
                    </span>
                @endif
            </button>
        </div>
    </div>

    {{-- 主内容区 --}}
    <div class="flex" style="height: calc(100% - 3rem);">

        {{-- 播放器主区域 --}}
        <div class="flex-1 flex flex-col min-w-0">

            {{-- 视频播放器 --}}
            <div class="relative flex-1 bg-black" style="min-height: 0;">
                @if($version && $version->preview)
                    <video
                        id="review-video"
                        class="w-full h-full object-contain"
                        x-ref="video"
                        x-on:timeupdate.window="onVideoTimeUpdate($event.target.currentTime, $event.target.duration)"
                        x-on:loadedmetadata.window="onDurationLoaded($event.target.duration)"
                        x-on:play.window="isPlaying = true"
                        x-on:pause.window="isPlaying = false"
                    >
                        <source src="{{ $version->fullPath() }}" type="video/mp4">
                    </video>
                @else
                    <div class="flex items-center justify-center h-full text-neutral-500">
                        <div class="text-center">
                            <svg class="w-16 h-16 mx-auto mb-3 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                                    d="M15 10l4.553-2.069A1 1 0 0121 8.879v6.242a1 1 0 01-1.447.889L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z"/>
                            </svg>
                            <p class="text-sm">暂无可播放版本</p>
                        </div>
                    </div>
                @endif

                {{-- 时间码叠加 --}}
                <div class="absolute top-3 left-3 px-2 py-1 bg-black/70 rounded text-xs font-mono text-white">
                    <span x-text="currentTimecode">00:00:00:00</span>
                    <span class="text-neutral-500"> / </span>
                    <span x-text="formatDuration(duration)" class="text-neutral-400">00:00:00</span>
                </div>

                {{-- 播放控制 --}}
                <div class="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 to-transparent">
                    <div class="flex items-center gap-3">
                        <button x-on:click="togglePlay" class="text-white hover:text-blue-400 transition-colors">
                            <svg x-show="!isPlaying" class="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M8 5v14l11-7z"/>
                            </svg>
                            <svg x-show="isPlaying" x-cloak class="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
                            </svg>
                        </button>
                        <div class="flex-1 relative">
                            {{-- 时间轴轨道 --}}
                            <div
                                class="h-1 bg-neutral-600 rounded-full cursor-pointer relative"
                                x-ref="timelineTrack"
                                x-on:click="seekToPosition($event)"
                            >
                                {{-- 进度条 --}}
                                <div
                                    class="absolute top-0 left-0 h-full bg-blue-500 rounded-full"
                                    :style="`width: ${progressPercent}%`"
                                ></div>

                                {{-- Thread Pins（时间轴上的评论标记） --}}
                                @foreach($threads as $thread)
                                    @if($thread['timecode_seconds'] !== null)
                                        <div
                                            wire:click="seekToThread({{ $thread['id'] }})"
                                            wire:key="pin-{{ $thread['id'] }}"
                                            class="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3 h-3 rounded-full cursor-pointer transition-transform hover:scale-125 z-10"
                                            :class="{{ $thread['is_resolved'] ? 'bg-yellow-400' : ($thread['id'] === $activeThreadId ? 'bg-blue-400 ring-2 ring-blue-400' : 'bg-red-500') }}"
                                            :style="`left: ${getPinPosition({{ $thread['timecode_seconds'] }}, duration)}%`"
                                            :title="'{{ $thread['comments'][0]['content'] ?? '' }}'"
                                        ></div>
                                    @endif
                                @endforeach
                            </div>
                        </div>
                        <button
                            x-on:click="toggleMute"
                            class="text-white hover:text-blue-400 transition-colors"
                        >
                            <svg x-show="!isMuted" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                    d="M15.536 8.464a5 5 0 010 7.072M18.364 5.636a9 9 0 010 12.728M6 15H4a1 1 0 01-1-1V9.414a1 1 0 011.414-.707l5.657 5.657a1 1 0 010 1.414L6 15z"/>
                            </svg>
                            <svg x-show="isMuted" x-cloak class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                    d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"/>
                            </svg>
                        </button>
                    </div>
                </div>
            </div>
        </div>

        {{-- 右侧评论面板 --}}
        @if($showCommentPanel)
            <div
                class="w-80 bg-neutral-800 border-l border-neutral-700 flex flex-col"
                x-show="showCommentPanel"
                x-transition:enter="transition ease-out duration-200"
                x-transition:enter-start="translate-x-full"
                x-transition:enter-end="translate-x-0"
            >
                <div class="flex items-center justify-between px-4 py-3 border-b border-neutral-700">
                    <h3 class="text-sm font-semibold text-white">
                        {{ $activeThread ? '评论串' : '新建评论' }}
                    </h3>
                    <button
                        wire:click="showCommentPanel = false"
                        class="text-neutral-400 hover:text-white transition-colors"
                    >
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                        </svg>
                    </button>
                </div>

                {{-- 当前 Thread 内容 --}}
                @if($activeThread)
                    <div class="flex-1 overflow-y-auto p-4 space-y-4">
                        {{-- Thread 头部（时间码） --}}
                        <div class="flex items-center gap-2 mb-3">
                            <span class="px-2 py-0.5 text-xs font-mono rounded bg-neutral-700 text-blue-400">
                                {{ $activeThread['timecode_formatted'] ?? $activeThread['timecode_seconds'] . 's' }}
                            </span>
                            <span
                                class="px-2 py-0.5 text-xs rounded"
                                :class="{{ $activeThread['is_resolved'] ? 'bg-yellow-900 text-yellow-400' : 'bg-red-900 text-red-400' }}"
                            >
                                {{ $activeThread['is_resolved'] ? '已解决' : '待处理' }}
                            </span>
                        </div>

                        {{-- 评论列表 --}}
                        @foreach($activeThread['comments'] ?? [] as $comment)
                            <div class="space-y-1">
                                <div class="flex items-start gap-2">
                                    <div class="w-6 h-6 rounded-full bg-neutral-600 flex-shrink-0 overflow-hidden">
                                        @if(isset($comment['user']['avatar_url']))
                                            <img src="{{ $comment['user']['avatar_url'] }}" class="w-full h-full object-cover">
                                        @endif
                                    </div>
                                    <div class="flex-1 min-w-0">
                                        <div class="flex items-baseline gap-2">
                                            <span class="text-xs font-medium text-white">
                                                {{ $comment['user']['name'] ?? '未知用户' }}
                                            </span>
                                            <span class="text-[10px] text-neutral-500">
                                                {{ \Carbon\Carbon::parse($comment['created_at'])->diffForHumans() }}
                                            </span>
                                        </div>
                                        <p class="text-sm text-neutral-300 mt-0.5 break-words">{{ $comment['content'] }}</p>

                                        @if(count($comment['mentions'] ?? []) > 0)
                                            <div class="flex flex-wrap gap-1 mt-1">
                                                @foreach($comment['mentions'] as $mention)
                                                    <span class="px-1.5 py-0.5 text-[10px] rounded bg-blue-900 text-blue-300">@ {{ $mention }}</span>
                                                @endforeach
                                            </div>
                                        @endif

                                        <button
                                            wire:click="addReply('{{ $comment['id'] }}')"
                                            class="text-[10px] text-neutral-500 hover:text-blue-400 mt-1 transition-colors"
                                        >
                                            回复
                                        </button>
                                    </div>
                                </div>
                            </div>
                        @endforeach

                        {{-- 操作按钮 --}}
                        <div class="flex gap-2 pt-2 border-t border-neutral-700">
                            @if(!$activeThread['is_resolved'])
                                <button
                                    wire:click="resolveThread({{ $activeThread['id'] }})"
                                    class="flex-1 px-3 py-1.5 text-xs font-medium rounded-lg bg-yellow-600 hover:bg-yellow-500 text-white transition-colors"
                                >
                                    标记为已解决
                                </button>
                            @else
                                <button
                                    wire:click="reopenThread({{ $activeThread['id'] }})"
                                    class="flex-1 px-3 py-1.5 text-xs font-medium rounded-lg bg-neutral-700 hover:bg-neutral-600 text-white transition-colors"
                                >
                                    重新打开
                                </button>
                            @endif
                        </div>
                    </div>
                @else
                    <div class="flex-1 flex items-center justify-center p-4">
                        <p class="text-sm text-neutral-500 text-center">
                            在时间轴上点击"+ 添加评论"<br>即可在当前位置添加评论
                        </p>
                    </div>
                @endif

                {{-- 输入框 --}}
                <div class="p-4 border-t border-neutral-700">
                    <div class="relative">
                        <textarea
                            wire:model.live="newCommentText"
                            rows="3"
                            placeholder="{{ $replyToCommentId ? '回复评论...' : '添加评论...' }}"
                            class="w-full bg-neutral-900 border border-neutral-600 rounded-lg px-3 py-2 text-sm text-white placeholder-neutral-500 resize-none focus:outline-none focus:border-blue-500"
                            x-ref="commentInput"
                        ></textarea>
                    </div>
                    <div class="flex items-center justify-between mt-2">
                        <span class="text-[10px] text-neutral-500">
                            @if($replyToCommentId)
                                回复中
                            @else
                                时间点: <span x-text="currentTimecode">00:00:00:00</span>
                            @endif
                        </span>
                        <button
                            wire:click="submitComment"
                            @Unless(trim($newCommentText))
                            disabled
                            @endUnless
                            class="px-4 py-1.5 text-xs font-medium rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white transition-colors"
                        >
                            发送
                        </button>
                    </div>
                </div>
            </div>
        @endif
    </div>

    {{-- 全局线程列表侧边栏 --}}
    @if($showThreadList)
        <div
            class="fixed inset-y-0 right-0 w-80 bg-neutral-800 border-l border-neutral-700 z-50 flex flex-col shadow-2xl"
            x-show="showThreadList"
            x-transition
        >
            <div class="flex items-center justify-between px-4 py-3 border-b border-neutral-700">
                <h3 class="text-sm font-semibold text-white">全部评论</h3>
                <button
                    wire:click="$set('showThreadList', false)"
                    class="text-neutral-400 hover:text-white transition-colors"
                >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                    </svg>
                </button>
            </div>
            <div class="flex-1 overflow-y-auto">
                @forelse($threads as $thread)
                    <div
                        wire:click="setActiveThread({{ $thread['id'] }})"
                        class="px-4 py-3 border-b border-neutral-700 hover:bg-neutral-700/50 cursor-pointer transition-colors"
                        :class="{{ $thread['id'] === $activeThreadId ? 'bg-neutral-700/70' : '' }}"
                    >
                        <div class="flex items-start gap-2">
                            <span
                                class="mt-0.5 w-2 h-2 rounded-full flex-shrink-0"
                                :class="{{ $thread['is_resolved'] ? 'bg-yellow-400' : 'bg-red-500' }}"
                            ></span>
                            <div class="flex-1 min-w-0">
                                <p class="text-sm text-white truncate">
                                    {{ $thread['comments'][0]['content'] ?? '无内容' }}
                                </p>
                                <div class="flex items-center gap-2 mt-1">
                                    <span class="text-[10px] font-mono text-blue-400">
                                        {{ $thread['timecode_formatted'] ?? sprintf('%.1fs', $thread['timecode_seconds']) }}
                                    </span>
                                    <span class="text-[10px] text-neutral-500">
                                        {{ $thread['comments_count'] }} 条回复
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                @empty
                    <div class="p-8 text-center text-neutral-500 text-sm">
                        暂无评论
                    </div>
                @endforelse
            </div>
        </div>
    @endif

</div>

@once
@push('styles')
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/video.js@8/dist/video-js.min.css">
@endpush
@push('scripts')
<script src="https://cdn.jsdelivr.net/npm/video.js@8/dist/video.min.js"></script>
@endpush
@endonce

<script>
function reviewPlayer() {
    return {
        isPlaying: false,
        isMuted: false,
        currentTime: 0,
        duration: 0,
        showThreadList: false,

        init() {
            // 初始化 Video.js
            if (document.getElementById('review-video')) {
                this.player = videojs('review-video', {
                    controls: false,
                    autoplay: false,
                    preload: 'auto',
                    fluid: true,
                });

                this.player.on('timeupdate', () => {
                    this.currentTime = this.player.currentTime();
                    this.$dispatch('playerTimeUpdate', {
                        currentTime: this.currentTime,
                        duration: this.duration
                    });
                });

                this.player.on('loadedmetadata', () => {
                    this.duration = this.player.duration();
                    this.$dispatch('playerDurationLoaded', this.duration);
                });

                this.player.on('play', () => {
                    this.isPlaying = true;
                    this.$dispatch('playerPlay');
                });

                this.player.on('pause', () => {
                    this.isPlaying = false;
                    this.$dispatch('playerPause');
                });
            }

            // 监听 Livewire 事件
            window.Livewire.on('refreshThreads', () => {
                // Livewire 会自动刷新 threads
            });
        },

        togglePlay() {
            if (this.player) {
                this.player[this.isPlaying ? 'pause' : 'play']();
            }
        },

        toggleMute() {
            if (this.player) {
                this.player.muted(!this.player.muted());
                this.isMuted = this.player.muted();
            }
        },

        seekToPosition(event) {
            const track = this.$refs.timelineTrack;
            if (!track || !this.duration) return;

            const rect = track.getBoundingClientRect();
            const percent = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
            const time = percent * this.duration;

            if (this.player) {
                this.player.currentTime(time);
            }
            this.$dispatch('playerSeek', { timecode: time });
        },

        onVideoTimeUpdate(currentTime, duration) {
            this.currentTime = currentTime;
            this.duration = duration || this.duration;
        },

        onDurationLoaded(duration) {
            this.duration = duration;
        },

        get progressPercent() {
            if (!this.duration) return 0;
            return (this.currentTime / this.duration) * 100;
        },

        formatDuration(seconds) {
            if (!seconds) return '00:00:00';
            const h = Math.floor(seconds / 3600);
            const m = Math.floor((seconds % 3600) / 60);
            const s = Math.floor(seconds % 60);
            return [h, m, s].map(v => String(v).padStart(2, '0')).join(':');
        },

        getPinPosition(timecodeSeconds, duration) {
            if (!duration) return 0;
            return Math.min(100, Math.max(0, (timecodeSeconds / duration) * 100));
        },
    }
}
</script>
