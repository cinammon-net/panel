<?php

// app/Http/Controllers/NetworkController.php
namespace App\Http\Controllers;

use Illuminate\Http\Request;

class NetworkController extends Controller
{
    public function getIps()
    {
        $ips = [];

        // Usa shell para obtener interfaces y IPs (soporta IPv4 e IPv6)
        $output = shell_exec("ip -o addr show | awk '{print $4}'");
        $lines = explode("\n", trim($output));

        foreach ($lines as $line) {
            $ip = explode("/", $line)[0]; // Elimina el /cidr
            if (filter_var($ip, FILTER_VALIDATE_IP)) {
                $ips[] = $ip;
            }
        }

        // Opcional: eliminar duplicados
        $ips = array_unique($ips);

        return response()->json($ips);
    }
}
