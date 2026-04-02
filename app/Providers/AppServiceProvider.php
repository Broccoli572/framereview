<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use App\Services\Domain;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        // 单例绑定领域服务
        $this->app->singleton(Domain\IdentityAccess\Service::class);
        $this->app->singleton(Domain\Projects\Service::class);
        $this->app->singleton(Domain\Assets\Service::class);
        $this->app->singleton(Domain\Review\Service::class);
        $this->app->singleton(Domain\Share\Service::class);
    }

    public function boot(): void
    {
        //
    }
}
