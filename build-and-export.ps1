# FrameReview V2 — Windows 本地构建 + 导出镜像脚本
# 在 PowerShell 中以管理员身份运行

$ErrorActionPreference = "Stop"
$ProjectDir = "C:\Users\cheru\.qclaw\workspace\video-hub-v2"
$OutputFile = "C:\Users\cheru\Desktop\framereview-all-images.tar"

Write-Host "==> 项目目录: $ProjectDir" -ForegroundColor Cyan

# ── 1. 构建 app 镜像 ──
Write-Host "`n==> [1/3] 构建 framereview-app 镜像..." -ForegroundColor Yellow
Set-Location $ProjectDir
docker build -t framereview-app:latest -f docker/Dockerfile .

if ($LASTEXITCODE -ne 0) {
    Write-Host "framereview-app 构建失败" -ForegroundColor Red
    exit 1
}

# ── 2. 构建 media-worker 镜像（关键：cd 到 media-worker 目录）──
Write-Host "`n==> [2/3] 构建 framereview-worker 镜像..." -ForegroundColor Yellow
Set-Location "$ProjectDir\media-worker"
docker build -t framereview-worker:latest -f Dockerfile .

if ($LASTEXITCODE -ne 0) {
    Write-Host "framereview-worker 构建失败" -ForegroundColor Red
    exit 1
}

# ── 3. 拉取官方镜像并打 tag ──
Write-Host "`n==> [3/3] 拉取官方镜像并打 tag..." -ForegroundColor Yellow

$images = @(
    @{ name="nginx"; tag="1.26-alpine" },
    @{ name="postgres"; tag="16-alpine" },
    @{ name="redis"; tag="7-alpine" },
    @{ name="minio/minio"; tag="latest" },
    @{ name="getmeili/meilisearch"; tag="v1.6" }
)

foreach ($img in $images) {
    $fullTag = "$($img.name):$($img.tag)"
    $aliTag = "registry.cn-hangzhou.aliyuncs.com/library/$($img.name):$($img.tag)"
    
    Write-Host "  拉取: $fullTag" -ForegroundColor Gray
    docker pull $fullTag
    
    Write-Host "  打标: $aliTag" -ForegroundColor Gray
    docker tag $fullTag $aliTag
}

# ── 4. 导出所有镜像 ──
Write-Host "`n==> 导出所有镜像到: $OutputFile" -ForegroundColor Green

docker save -o $OutputFile `
    framereview-app:latest `
    framereview-worker:latest `
    registry.cn-hangzhou.aliyuncs.com/library/nginx:1.26-alpine `
    registry.cn-hangzhou.aliyuncs.com/library/postgres:16-alpine `
    registry.cn-hangzhou.aliyuncs.com/library/redis:7-alpine `
    registry.cn-hangzhou.aliyuncs.com/library/minio/minio:latest `
    registry.cn-hangzhou.aliyuncs.com/library/getmeili/meilisearch:v1.6

if ($LASTEXITCODE -ne 0) {
    Write-Host "导出失败" -ForegroundColor Red
    exit 1
}

$fileSize = (Get-Item $OutputFile).Length / 1MB
Write-Host "`n==> 完成！文件大小: $([math]::Round($fileSize, 1)) MB" -ForegroundColor Green
Write-Host "==> 文件位置: $OutputFile" -ForegroundColor Green
Write-Host "`n下一步：上传到 NAS 后执行 docker load -i /volume1/docker/framereview-all-images.tar" -ForegroundColor Cyan
