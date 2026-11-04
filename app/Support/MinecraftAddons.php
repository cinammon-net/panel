<?php

namespace App\Support;

use App\Models\Server;

/**
 * Qué carpetas de addons usa cada tipo de servidor de Minecraft:
 *   plugins → Paper, Spigot, Purpur, Velocity, BungeeCord...
 *   mods    → Fabric, Forge, NeoForge, Quilt, Sponge y modpacks
 *   both    → híbridos (Mohist, Magma, Ketting...)
 *   none    → Vanilla, Bedrock, PocketMine... (no cargan .jar)
 *   auto    → huevo desconocido: se decide por las carpetas que existan
 */
class MinecraftAddons
{
    private const RULES = [
        // Primero los casos concretos que contienen palabras de otras reglas.
        'none' => ['nanolimbo', 'pocketmine', 'cuberite', 'liteloader', 'viaaas', 'feather'],
        'both' => ['mohist', 'magma', 'ketting', 'arclight', 'catserver', 'crucible'],
        'mods' => ['fabric', 'quilt', 'forge', 'curseforge', 'modrinth', 'ftb', 'feed the beast', 'tekkit', 'hexxit', 'blightfall', 'b-team', 'the 1.', 'sponge', 'modpack', 'technic'],
        'plugins' => ['paper', 'purpur', 'spigot', 'bukkit', 'folia', 'pufferfish', 'velocity', 'bungee', 'waterfall', 'travertine', 'waterdog', 'glowstone', 'gomint', 'krypton', 'nukkit', 'viaproxy', 'limbo'],
        'none ' => ['vanilla', 'bedrock'],
    ];

    /** 'plugins' | 'mods' | 'both' | 'none' | 'auto', o null si no es un servidor de Minecraft. */
    public static function kind(?Server $server): ?string
    {
        if (! $server || $server->egg?->category !== 'minecraft') {
            return null;
        }
        $name = strtolower((string) $server->egg->name);
        foreach (self::RULES as $kind => $words) {
            foreach ($words as $word) {
                if (str_contains($name, $word)) {
                    return trim($kind);
                }
            }
        }

        return 'auto';
    }

    /**
     * Servidores Java con jugadores (op, whitelist, ban...). Excluye proxies (Velocity, BungeeCord...),
     * limbos y Bedrock/PocketMine, que no usan esos comandos ni esos archivos.
     */
    public static function hasPlayerLists(?Server $server): bool
    {
        $kind = self::kind($server);
        if ($kind === null) {
            return false;
        }
        $name = strtolower((string) $server->egg->name);
        // Vanilla Java no carga plugins pero sí tiene op, whitelist y baneos.
        if ($kind === 'none' && ! (str_contains($name, 'vanilla') && ! str_contains($name, 'bedrock'))) {
            return false;
        }
        foreach (['velocity', 'bungee', 'waterfall', 'travertine', 'waterdog', 'viaproxy', 'limbo', 'gomint', 'nukkit'] as $word) {
            if (str_contains($name, $word)) {
                return false;
            }
        }

        return true;
    }

    /** Carpetas que se muestran, o null = las que existan (auto). */
    public static function folders(?string $kind): ?array
    {
        return match ($kind) {
            'plugins' => ['plugins'],
            'mods' => ['mods'],
            'both' => ['plugins', 'mods'],
            'none' => [],
            default => null,
        };
    }
}
