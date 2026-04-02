<div x-data="{
    dragOver: false,
    uploads: @entangle('uploads'),
    isDragOver() { return this.dragOver },
}" x-on:dragover.prevent="dragOver = true"
  x-on:dragleave.prevent="dragOver = false"
  x-on:drop.prevent="dragOver = false; $wire.upload($event.dataTransfer.files[0])"
  class="relative"
>
    {{-- 拖拽区域 --}}
    <div
        :class="dragOver
            ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
            : 'border-gray-200 dark:border-gray-700 hover:border-indigo-300 dark:hover:border-indigo-700'
        "
        class="border-2 border-dashed rounded-2xl p-8 text-center transition-all duration-200 cursor-pointer"
        x-on:click="$refs.fileInput.click()"
    >
        <input type="file" x-ref="fileInput" x-on:change="const f = $event.target.files[0]; if(f) $wire.startUpload(f)" class="hidden" multiple accept="video/*,audio/*,image/*,.pdf">

        <div class="flex flex-col items-center gap-3">
            <div class="w-12 h-12 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center">
                <svg class="w-6 h-6 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/>
                </svg>
            </div>
            <div>
                <p class="text-sm font-medium text-gray-700 dark:text-gray-200">
                    拖拽文件到此处，或 <span class="text-indigo-600 dark:text-indigo-400 underline">点击选择</span>
                </p>
                <p class="text-xs text-gray-400 mt-1">
                    支持视频、音频、图片、PDF，单文件最大 10GB
                </p>
            </div>
        </div>
    </div>

    {{-- 上传列表 --}}
    <div class="mt-4 space-y-2" x-show="Object.keys(uploads).length > 0">
        <template x-for="[id, upload] in Object.entries(uploads)" :key="id">
            <div class="flex items-center gap-3 p-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
                {{-- 图标 --}}
                <div class="flex-shrink-0">
                    <template x-if="upload.status === 'ready'">
                        <svg class="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                        </svg>
                    </template>
                    <template x-if="upload.status === 'error'">
                        <svg class="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                        </svg>
                    </template>
                    <template x-if="upload.status === 'uploading' || upload.status === 'processing'">
                        <div class="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                    </template>
                </div>

                {{-- 文件信息 --}}
                <div class="flex-1 min-w-0">
                    <p class="text-sm font-medium text-gray-800 dark:text-gray-200 truncate" x-text="upload.name"></p>
                    <div class="flex items-center gap-2 mt-0.5">
                        <template x-if="upload.status === 'uploading'">
                            <span class="text-xs text-gray-400">上传中...</span>
                        </template>
                        <template x-if="upload.status === 'processing'">
                            <span class="text-xs text-indigo-500">处理中...</span>
                        </template>
                        <template x-if="upload.status === 'ready'">
                            <span class="text-xs text-green-500">完成</span>
                        </template>
                        <template x-if="upload.status === 'error'">
                            <span class="text-xs text-red-500" x-text="upload.error || '失败'"></span>
                        </template>
                    </div>
                </div>

                {{-- 进度条（上传中） --}}
                <template x-if="upload.status === 'uploading'">
                    <div class="w-24 h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div class="h-full bg-indigo-500 rounded-full transition-all duration-300"
                             :style="`width: ${upload.progress}%`"></div>
                    </div>
                </template>

                {{-- 关闭按钮 --}}
                <button x-on:click="$wire.dismiss(id)"
                        class="flex-shrink-0 p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                    <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                    </svg>
                </button>
            </div>
        </template>
    </div>
</div>
