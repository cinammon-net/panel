<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;

class Reload extends Command
{
    protected $description = 'Reload environment settings, pull latest code, and rebuild npm packages';
    protected $signature = 'reload';

    public function handle(): void
    {
        // Iniciar el proceso con el estilo de barra de carga
        $this->line($this->loadingBar('Starting Reload Changes process...'));

        // Limpiar la caché de la configuración
        $this->comment('Clearing configuration cache...');
        $this->call('config:clear');
        $this->updateLoadingBar('✔️ Configuration cache cleared!');

        // Limpiar la caché de rutas
        $this->comment('Clearing route cache...');
        $this->call('route:clear');
        $this->updateLoadingBar('✔️ Route cache cleared!');

        // Limpiar la caché de la vista
        $this->comment('Clearing view cache...');
        $this->call('view:clear');
        $this->updateLoadingBar('✔️ Views cache cleared!');

        // Limpiar la caché de eventos
        $this->comment('Clearing event cache...');
        $this->call('event:clear');
        $this->updateLoadingBar('✔️ Events cache cleared!');

        // Volver a generar la configuración de las rutas
        $this->comment('Caching the routes...');
        $this->call('route:cache');
        $this->updateLoadingBar('✔️ Routes cached successfully!');

        // Volver a generar la configuración
        $this->comment('Caching the config...');
        $this->call('config:cache');
        $this->updateLoadingBar('✔️ Configuration cached!');

        // Volver a generar las vistas
        $this->comment('Caching the views...');
        $this->call('view:cache');
        $this->updateLoadingBar('✔️ Blade templates cached successfully!');

        // Ejecutar git pull para obtener los cambios más recientes del repositorio
        $this->comment('Pulling the latest changes from Git...');
        $gitPull = $this->executeCommand('git pull');
        if ($gitPull !== 0) {
            $this->updateLoadingBar('❌ Git pull failed!');
            return;
        }
        $this->updateLoadingBar('✔️ Git pull completed successfully!');

        // Ejecutar npm rebuild para reconstruir los módulos de Node
        $this->comment('Rebuilding npm packages...');
        $npmRebuild = $this->executeCommand('npm rebuild');
        if ($npmRebuild !== 0) {
            $this->updateLoadingBar('❌ NPM rebuild failed!');
            return;
        }
        $this->updateLoadingBar('✔️ NPM rebuild completed successfully!');

        // Mensaje final de éxito
        $this->updateLoadingBar('✅ Reload Changes completed successfully!');
    }

    /**
     * Ejecutar un comando en la terminal y devolver el código de salida
     *
     * @param string $command
     * @return int
     */
    protected function executeCommand(string $command): int
    {
        $process = proc_open(
            $command,
            [
                1 => ['pipe', 'w'],
                2 => ['pipe', 'w'],
            ],
            $pipes
        );

        if (!is_resource($process)) {
            return 1;
        }

        // Obtener la salida del comando
        $output = stream_get_contents($pipes[1]);
        fclose($pipes[1]);
        $errorOutput = stream_get_contents($pipes[2]);
        fclose($pipes[2]);

        // Ver si hay algún error en la salida
        if (!empty($errorOutput)) {
            $this->error($errorOutput);
        } else {
            $this->line($output);
        }

        $returnCode = proc_close($process);

        return $returnCode;
    }

    /**
     * Función para simular una barra de carga en la terminal
     * 
     * @param string $message
     * @return string
     */
    protected function loadingBar(string $message): string
    {
        // Inicializar la barra
        $barLength = 50; // Longitud de la barra
        $filledLength = 0;

        // Imprimir el mensaje de inicio de la barra
        $this->output->write($message . "\n");
        $this->output->write("[");
        for ($i = 0; $i < $barLength; $i++) {
            usleep(50000); // Pausa para simular carga
            $filledLength = $i + 1;
            $this->output->write(str_repeat('▓', $filledLength));
            $this->output->write(str_repeat('░', $barLength - $filledLength));
            $this->output->write("]");
            $this->output->write("\r");
        }
        $this->output->write("\n");

        return "✔️ $message";
    }

    /**
     * Actualiza el mensaje de la barra de carga al completar una tarea
     * 
     * @param string $message
     * @return void
     */
    protected function updateLoadingBar(string $message): void
    {
        $this->output->write("\r");  // Borra la línea anterior
        $this->line($message); // Muestra el mensaje actualizado
    }
}
