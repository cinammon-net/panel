<?php

namespace Database\Seeders;

use App\Models\Egg;
use App\Models\EggVariable; // Asegúrate que este modelo existe y apunta a la tabla egg_variables
use Illuminate\Database\Seeder;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Str;
use App\Services\Eggs\Sharing\EggImporterService;

class EggSeeder extends Seeder
{
    protected EggImporterService $importerService;

    public function __construct(EggImporterService $importerService)
    {
        $this->importerService = $importerService;
    }

    public function run(): void
    {
        $path = database_path('seeders/eggs');
        $directories = array_filter(glob("$path/*"), 'is_dir');

        foreach ($directories as $dir) {
            $category = basename($dir);
            $this->parseEggFiles($category);
        }
    }

    protected function parseEggFiles(string $category): void
    {
        $folder = Str::kebab($category);
        $path = database_path("seeders/eggs/{$folder}");

        if (!is_dir($path)) {
            $this->command->warn("❗ No se encontró la carpeta: {$folder}");
            return;
        }

        $this->command->line("\033[1;36m〄──────────────────────────────────────────────\033[0m");
        $this->command->line("\033[1;35m⌁ C I N A M M O N . N E T ┊ Egg Deployment\033[0m");
        $this->command->line("\033[1;32m⌁ Categoría detectada: {$category}\033[0m");
        $this->command->line("\033[1;33m⌁ Nodo de actualización activo\033[0m");
        $this->command->line("\033[1;36m〄──────────────────────────────────────────────\033[0m");

        foreach (new \DirectoryIterator($path) as $file) {
            if (!$file->isFile() || !$file->isReadable() || $file->getExtension() !== 'json') {
                continue;
            }

            try {
                $decoded = json_decode(file_get_contents($file->getRealPath()), true, 512, JSON_THROW_ON_ERROR);
            } catch (\Exception) {
                $this->command->error("❌ Error al leer archivo: " . $file->getFilename());
                continue;
            }

            $uploadedFile = new UploadedFile(
                $file->getPathname(),
                $file->getFilename(),
                'application/json',
                null,
                true
            );

            $egg = Egg::query()
                ->where('author', $decoded['author'])
                ->where('name', $decoded['name'])
                ->first();

            if ($egg) {
                $this->importerService->fromFile($uploadedFile, $egg);
                $this->command->info("✔ Actualizado: " . $decoded['name']);
            } else {
                $this->importerService->fromFile($uploadedFile);
                $egg = Egg::query()
                    ->where('author', $decoded['author'])
                    ->where('name', $decoded['name'])
                    ->first();
                $this->command->comment("✔ Creado: " . $decoded['name']);
            }

            // Ahora guardamos las variables en egg_variables
            if ($egg && !empty($decoded['variables']) && is_array($decoded['variables'])) {
                foreach ($decoded['variables'] as $variableData) {
                    EggVariable::updateOrCreate(
                        [
                            'egg_id' => $egg->id,
                            'env_variable' => $variableData['env_variable'] ?? null,
                        ],
                        [
                            'name' => $variableData['name'] ?? null,
                            'description' => $variableData['description'] ?? null,
                            'default_value' => $variableData['default_value'] ?? null,
                            'user_viewable' => $variableData['user_viewable'] ?? false,
                            'user_editable' => $variableData['user_editable'] ?? false,
                            'rules' => isset($variableData['rules']) ? json_encode($variableData['rules']) : null,
                            'sort' => $variableData['sort'] ?? 0,
                        ]
                    );
                }

                foreach ($decoded['variables'] as $variable) {
                    $name = $variable['name'] ?? 'N/A';
                    $env = $variable['env_variable'] ?? 'N/A';
                    $this->command->line("    \033[0;36m└─ Variable:\033[0m \033[1;33m{$name}\033[0m (\033[0;35m{$env}\033[0m)");
                }
            }

            $this->command->line('');
        }

        $this->command->line('');
    }
}
