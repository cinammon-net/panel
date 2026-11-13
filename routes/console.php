<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

\Illuminate\Support\Facades\Schedule::command('nodes:check-status')->everyMinute()->withoutOverlapping();
\Illuminate\Support\Facades\Schedule::command('birthdays:celebrate')->hourlyAt(1)->withoutOverlapping();
\Illuminate\Support\Facades\Schedule::command('gallery:update-captures')->dailyAt('04:00')->withoutOverlapping();
