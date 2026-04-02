<?php

use Illuminate\Support\Facades\Schedule;

/*
|─────────────────────────────────────────────────────────────
| Console 路由 — FrameReview V2
| 定时任务、队列 worker 入口
|─────────────────────────────────────────────────────────────
*/

// 清理回收站（30天前）
Schedule::command('model:prune', ['--model' => \App\Models\Asset::class])
    ->daily();

// 清理过期分享
Schedule::command('shares:cleanup')->daily();

// 媒体处理失败重试
Schedule::command('media:retry-failed')->everyFiveMinutes();
