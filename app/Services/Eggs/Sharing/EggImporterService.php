<?php

namespace App\Services\Eggs\Sharing;

use App\Models\Egg;
use Illuminate\Http\UploadedFile;

class EggImporterService
{
    public function fromFile(UploadedFile $file, ?Egg $existingEgg = null): void
    {
        $data = json_decode(file_get_contents($file->getRealPath()), true, 512, JSON_THROW_ON_ERROR);

        $fields = [
            'uuid' => $data['uuid'],
            'author' => $data['author'],
            'name' => $data['name'],
            'description' => $data['description'] ?? '',
            'startup' => $data['startup'] ?? null,
            'config_from' => $data['config_from'] ?? null,
            'config_stop' => $data['config']['stop'] ?? null,
            'config_logs' => $data['config']['logs'] ?? null,
            'config_startup' => $data['config']['startup'] ?? null,
            'config_files' => json_encode($data['config']['files'] ?? []),
            'script_install' => $data['scripts']['installation']['script'] ?? null,
            'script_is_privileged' => $data['scripts']['installation']['is_privileged'] ?? false,
            'script_entry' => $data['scripts']['installation']['entrypoint'] ?? null,
            'script_container' => $data['scripts']['installation']['container'] ?? null,
            'copy_script_from' => $data['copy_script_from'] ?? null,
            'features' => json_encode($data['features'] ?? []),
            'docker_images' => json_encode($data['docker_images'] ?? []),
            'update_url' => $data['meta']['update_url'] ?? null,
            'file_denylist' => json_encode($data['file_denylist'] ?? []),
            'force_outgoing_ip' => isset($data['force_outgoing_ip']) ? (bool)$data['force_outgoing_ip'] : null,
            'tags' => implode(',', $data['tags'] ?? []),
        ];

        if ($existingEgg) {
            $existingEgg->update($fields);
        } else {
            Egg::create($fields);
        }
    }
}
