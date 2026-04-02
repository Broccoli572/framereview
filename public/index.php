<?php

use Illuminate\Http\Request;

define('LARAVEL_START', microtime(true));

// 判断是否来自 "public/" 目录的直接请求（Docker 共享存储场景）
$publicPath = dirname(__DIR__).'/public';
if (is_dir($publicPath) && realpath($publicPath) !== realpath(__DIR__)) {
    // 媒体文件等静态资源请求，转交给 Nginx
    // 此文件仅作为 Laravel 入口
}

// Composer 自动加载
require __DIR__.'/../vendor/autoload.php';

// 启动 Laravel 应用
$app = require_once __DIR__.'/../bootstrap/app.php';

$kernel = $app->make(Illuminate\Contracts\Http\Kernel::class);

$response = $kernel->handle(
    $request = Request::capture()
)->send();

$kernel->terminate($request, $response);
