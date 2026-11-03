<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class ExportDemoCatalog extends Command
{
    protected $signature = 'demo:export-catalog';

    protected $description = 'Guarda los eggs de este panel en database/demo/catalog.json para que la instalación demo los use sin acceder a esta base de datos';

    public function handle(): int
    {
        if (config('panel.demo')) {
            $this->error('Ejecuta este comando en el panel real, no en la demo.');

            return self::FAILURE;
        }

        $catalog = [];
        foreach (['eggs', 'egg_variables'] as $table) {
            $catalog[$table] = DB::table($table)->get()->map(fn ($row) => (array) $row)->all();
        }

        $path = database_path('demo/catalog.json');
        @mkdir(dirname($path), 0775, true);
        file_put_contents($path, json_encode($catalog, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR));

        $this->info('Catálogo exportado a '.$path.' ('.count($catalog['eggs']).' eggs, '.count($catalog['egg_variables']).' variables).');

        return self::SUCCESS;
    }
}
