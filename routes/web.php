<?php

use Illuminate\Support\Facades\Route;

/*
|─────────────────────────────────────────────────────────────
| Web 路由 — FrameReview V2
|─────────────────────────────────────────────────────────────
*/

// 分享页（无需登录）
Route::get('s/{token}', [\App\Http\Controllers\ShareController::class, 'show'])
    ->name('share.show');

// SPA 主应用（所有未匹配路由）
Route::view('/{any?}', 'app')->where('any', '.*')->name('app');
