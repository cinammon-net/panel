<?php

namespace App\Traits\Commands;

trait RequestRedisSettingsTrait
{
    protected function requestRedisSettings(): void
    {
        $this->variables['REDIS_HOST'] = $this->option('redis-host') ?? $this->ask('Redis Host', '127.0.0.1');
        $this->variables['REDIS_USER'] = $this->option('redis-user') ?? $this->ask('Redis User', null);
        $this->variables['REDIS_PASSWORD'] = $this->option('redis-pass') ?? $this->ask('Redis Password', null);
        $this->variables['REDIS_PORT'] = $this->option('redis-port') ?? $this->ask('Redis Port', 6379);
    }
}