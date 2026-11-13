<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Process;
use Illuminate\Support\Facades\Storage;

class UpdateGalleryCaptures extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'gallery:update-captures {--force : Forzar la actualizacion independientemente de la estacion}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Actualiza las capturas de la galeria segun la estacion o festividad activa';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('Comprobando estacion o festividad actual...');

        // 1. Obtener estado de temporada actual
        $seasonKey = 'default';
        $seasonName = 'Estandar';
        $holidayKey = null;

        try {
            $billingUrl = rtrim((string) config('services.billing.url', 'https://billing.cinammon.net'), '/');
            $response = Http::withoutVerifying()->timeout(5)->get("{$billingUrl}/api/season");
            if ($response->successful()) {
                $data = $response->json();
                $seasonKey = $data['season']['key'] ?? 'default';
                $seasonName = $data['season']['name'] ?? 'Estandar';
                $holidayKey = $data['holiday']['key'] ?? null;
                if ($holidayKey) {
                    $seasonName .= ' / ' . ($data['holiday']['name'] ?? $holidayKey);
                }
            }
        } catch (\Throwable $e) {
            $this->warn('No se pudo contactar con la API de temporada, usando fecha local.');
            $month = (int) date('n');
            $seasonKey = match (true) {
                in_array($month, [12, 1, 2], true) => 'winter',
                in_array($month, [3, 4, 5], true) => 'spring',
                in_array($month, [6, 7, 8], true) => 'summer',
                default => 'autumn',
            };
        }

        $activeTheme = $holidayKey ?: $seasonKey;
        $this->line("Temporada activa detectada: <comment>{$activeTheme}</comment> ({$seasonName})");

        // 2. Comprobar si ya se habian tomado capturas para esta estacion
        $metaPath = public_path('storage/gallery/meta.json');
        $prevTheme = null;
        if (file_exists($metaPath)) {
            $meta = json_decode(file_get_contents($metaPath), true);
            $prevTheme = $meta['theme'] ?? null;
        }

        if (!$this->option('force') && $prevTheme === $activeTheme) {
            $this->info("La galeria ya esta actualizada para la festividad/estacion activa ({$activeTheme}). Sin cambios necesarios.");
            return Command::SUCCESS;
        }

        $this->info("Actualizando capturas de la galeria para [{$activeTheme}]...");

        // 3. Script Node Playwright
        $scriptPath = base_path('../screenshots/update-gallery-shots.mjs');
        if (!file_exists($scriptPath)) {
            $scriptPath = base_path('screenshots/update-gallery-shots.mjs');
        }

        if (!file_exists($scriptPath)) {
            $this->error("No se encontro el script de captura en: {$scriptPath}");
            return Command::FAILURE;
        }

        $cmd = "node " . escapeshellarg($scriptPath);
        $this->line("Ejecutando: {$cmd}");
        
        $process = Process::path(dirname($scriptPath))->run($cmd);

        if (!$process->successful()) {
            $this->error("Fallo al ejecutar la captura: " . $process->errorOutput());
            Log::error("Fallo en gallery:update-captures: " . $process->errorOutput());
            return Command::FAILURE;
        }

        // 4. Guardar metadatos actualizados
        $metaData = [
            'theme' => $activeTheme,
            'season_name' => $seasonName,
            'updated_at' => now()->toIso8601String(),
        ];
        @file_put_contents($metaPath, json_encode($metaData, JSON_PRETTY_PRINT));

        $this->info("Galeria actualizada con exito para [{$activeTheme}]!");
        Log::info("Galeria de Cinammon actualizada para la temporada {$activeTheme}.");

        return Command::SUCCESS;
    }
}
