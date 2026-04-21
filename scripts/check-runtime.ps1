$ErrorActionPreference = 'SilentlyContinue'

function Test-CommandAvailable {
  param([string]$Name)

  $cmd = Get-Command $Name -ErrorAction SilentlyContinue
  if ($cmd) {
    return $cmd.Source
  }

  return $null
}

function Write-CheckLine {
  param(
    [string]$Label,
    [bool]$Ok,
    [string]$Detail
  )

  $status = if ($Ok) { '[OK]' } else { '[MISSING]' }
  Write-Output ("{0} {1}: {2}" -f $status, $Label, $Detail)
}

$projectRoot = Split-Path -Parent $PSScriptRoot
$envFile = Join-Path $projectRoot '.env'

Write-Output "FrameReview runtime check"
Write-Output "Project: $projectRoot"
Write-Output ""

$hasEnvFile = Test-Path $envFile
Write-CheckLine 'Env file' $hasEnvFile ($(if ($hasEnvFile) { $envFile } else { 'Create .env from .env.example' }))

$databaseUrl = $env:DATABASE_URL
$redisUrl = $env:REDIS_URL
$jwtSecret = $env:JWT_SECRET

Write-CheckLine 'DATABASE_URL (process env)' (![string]::IsNullOrWhiteSpace($databaseUrl)) ($(if ($databaseUrl) { 'set' } else { 'not set in current shell' }))
Write-CheckLine 'REDIS_URL (process env)' (![string]::IsNullOrWhiteSpace($redisUrl)) ($(if ($redisUrl) { 'set' } else { 'not set in current shell' }))
Write-CheckLine 'JWT_SECRET (process env)' (![string]::IsNullOrWhiteSpace($jwtSecret)) ($(if ($jwtSecret) { 'set' } else { 'not set in current shell' }))

Write-Output ""

$nodePath = Test-CommandAvailable 'node'
$ffmpegPath = Test-CommandAvailable 'ffmpeg'
$ffprobePath = Test-CommandAvailable 'ffprobe'
$psqlPath = Test-CommandAvailable 'psql'
$dockerPath = Test-CommandAvailable 'docker'
$redisServerPath = Test-CommandAvailable 'redis-server'

Write-CheckLine 'node' ($null -ne $nodePath) ($(if ($nodePath) { $nodePath } else { 'not on PATH' }))
Write-CheckLine 'ffmpeg' ($null -ne $ffmpegPath) ($(if ($ffmpegPath) { $ffmpegPath } else { 'required for previews' }))
Write-CheckLine 'ffprobe' ($null -ne $ffprobePath) ($(if ($ffprobePath) { $ffprobePath } else { 'required for metadata' }))
Write-CheckLine 'psql' ($null -ne $psqlPath) ($(if ($psqlPath) { $psqlPath } else { 'optional if DB is remote' }))
Write-CheckLine 'docker' ($null -ne $dockerPath) ($(if ($dockerPath) { $dockerPath } else { 'optional local fallback' }))
Write-CheckLine 'redis-server' ($null -ne $redisServerPath) ($(if ($redisServerPath) { $redisServerPath } else { 'optional if Redis is remote or containerized' }))

Write-Output ""

$dockerService = Get-Service -Name 'com.docker.service' -ErrorAction SilentlyContinue
if ($dockerService) {
  Write-CheckLine 'Docker Desktop service' ($dockerService.Status -eq 'Running') $dockerService.Status
}

$uploadsDir = Join-Path $projectRoot 'uploads'
$uploadsExists = Test-Path $uploadsDir
Write-CheckLine 'uploads dir' $uploadsExists ($(if ($uploadsExists) { $uploadsDir } else { 'will be created by upload flow' }))

Write-Output ""
Write-Output "Recommended next step:"
if (-not $hasEnvFile) {
  Write-Output "1. Copy .env.example to .env and fill in DATABASE_URL / REDIS_URL / JWT_SECRET."
} elseif (-not $ffmpegPath -or -not $ffprobePath) {
  Write-Output "1. Install ffmpeg + ffprobe and add them to PATH."
} elseif (($null -eq $redisServerPath) -and (($null -eq $dockerService) -or $dockerService.Status -ne 'Running')) {
  Write-Output "1. Start Redis locally or start Docker Desktop and run Redis in a container."
} else {
  Write-Output "1. Start the API with 'npm start' and the worker with 'npm run worker:start'."
}
