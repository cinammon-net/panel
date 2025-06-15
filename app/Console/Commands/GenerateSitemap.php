<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Route;
use Spatie\Sitemap\Sitemap;
use Spatie\Sitemap\Tags\Url;

class GenerateSitemap extends Command
{
    protected $signature = 'sitemap:generate';
    protected $description = 'Genera automáticamente el sitemap.xml desde las rutas públicas';

    public function handle()
    {
        $sitemap = Sitemap::create();

        foreach (Route::getRoutes() as $route) {
            $uri = $route->uri();

            // Solo rutas GET visibles, sin parámetros y sin "api/"
            if (
                $route->methods()[0] === 'GET' &&
                !str_contains($uri, '{') &&
                !str_starts_with($uri, 'api') &&
                !str_starts_with($uri, '_') // para ignorar rutas internas tipo _debugbar
            ) {
                $sitemap->add(Url::create("/{$uri}"));
            }
        }

        $sitemap->writeToFile(public_path('sitemap.xml'));

        $this->info('✅ sitemap.xml generado con rutas detectadas automáticamente');
    }
}
