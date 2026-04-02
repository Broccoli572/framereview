<?php

namespace App\Livewire;

use Livewire\Component;
use Livewire\WithFileUploads;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

/**
 * 资产上传指示器组件
 *
 * 支持：
 * - 拖拽上传
 * - 点击选择文件
 * - 上传进度实时显示
 * - 拖放到指定文件夹
 *
 * @prop string $projectId   项目ID
 * @prop string|null $folderId  文件夹ID（可选）
 */
class UploadIndicator extends Component
{
    use WithFileUploads;

    /** @var array<string, array{id:string, name:string, size:int, progress:int, status:string, asset_id:string|null, error:string|null}> */
    public array $uploads = [];

    public string $projectId;
    public ?string $folderId = null;

    private const MAX_FILE_SIZE = 10 * 1024 * 1024 * 1024; // 10GB
    private const ALLOWED_MIMES = [
        'video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm', 'video/x-matroska',
        'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/aac', 'audio/flac',
        'image/jpeg', 'image/png', 'image/gif', 'image/webp',
        'application/pdf',
    ];

    public function mount(string $projectId, ?string $folderId = null): void
    {
        $this->projectId = $projectId;
        $this->folderId = $folderId;
    }

    /**
     * 处理拖拽或选择的文件
     */
    public function upload($files): void
    {
        $files = is_array($files) ? $files : [$files];

        foreach ($files as $file) {
            $this->processFile($file);
        }
    }

    private function processFile($file): void
    {
        $mimeType = $file->getMimeType() ?? 'application/octet-stream';

        // 类型校验
        if (! in_array($mimeType, self::ALLOWED_MIMES)) {
            $this->dispatch('upload:error', message: "不支持的类型: {$mimeType}");
            return;
        }

        // 大小校验
        if ($file->getSize() > self::MAX_FILE_SIZE) {
            $this->dispatch('upload:error', message: '文件超过 10GB 上限');
            return;
        }

        $uploadId = Str::random(10);

        $this->uploads[$uploadId] = [
            'id'       => $uploadId,
            'name'     => $file->getClientOriginalName(),
            'size'     => $file->getSize(),
            'progress' => 0,
            'status'   => 'uploading',
            'asset_id' => null,
            'error'    => null,
        ];

        // 小文件走直传，大文件走预签名（这里简化处理）
        if ($file->getSize() < 100 * 1024 * 1024) {
            $this->uploadDirect($uploadId, $file);
        } else {
            $this->dispatch('upload:error', message: '大文件上传请使用预签名直连模式');
        }
    }

    private function uploadDirect(string $uploadId, $file): void
    {
        try {
            $response = \Http::attach(
                'file',
                file_get_contents($file->getRealPath()),
                $file->getClientOriginalName()
            )->withToken(
                auth()->user()->currentAccessToken()->plainTextToken
            )->post(route('api.assets.upload'), [
                'project_id' => $this->projectId,
                'folder_id'  => $this->folderId,
            ]);

            if ($response->successful()) {
                $asset = $response->json('asset');
                $this->uploads[$uploadId]['status'] = 'processing';
                $this->uploads[$uploadId]['asset_id'] = $asset['id'];
                $this->dispatch('upload:completed', uploadId: $uploadId, asset: $asset);
            } else {
                throw new \Exception($response->body());
            }
        } catch (\Throwable $e) {
            $this->uploads[$uploadId]['status'] = 'error';
            $this->uploads[$uploadId]['error'] = $e->getMessage();
            $this->dispatch('upload:error', uploadId: $uploadId, message: $e->getMessage());
        }
    }

    public function dismiss(string $uploadId): void
    {
        unset($this->uploads[$uploadId]);
    }

    public function render()
    {
        return view('livewire.upload-indicator');
    }
}
