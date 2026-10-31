<?php

namespace App\Http\Controllers;

use App\Models\Node;

class NetworkController extends Controller
{
    public function getIps()
    {
        $ips = ['127.0.0.1'];

        $output = @shell_exec("ip -o addr show 2>/dev/null | awk '{print \$4}'");
        if (is_string($output) && trim($output) !== '') {
            foreach (explode("\n", trim($output)) as $line) {
                $ip = explode('/', trim($line))[0];
                if (filter_var($ip, FILTER_VALIDATE_IP)) {
                    $ips[] = $ip;
                }
            }
        }

        $hostIps = @gethostbynamel(gethostname() ?: 'localhost');
        if (is_array($hostIps)) {
            foreach ($hostIps as $ip) {
                if (filter_var($ip, FILTER_VALIDATE_IP)) {
                    $ips[] = $ip;
                }
            }
        }

        if (!empty($_SERVER['SERVER_ADDR']) && filter_var($_SERVER['SERVER_ADDR'], FILTER_VALIDATE_IP)) {
            $ips[] = $_SERVER['SERVER_ADDR'];
        }

        foreach (Node::pluck('fqdn') as $fqdn) {
            if (filter_var($fqdn, FILTER_VALIDATE_IP)) {
                $ips[] = $fqdn;
            } else {
                $resolved = @gethostbyname($fqdn);
                if ($resolved && $resolved !== $fqdn && filter_var($resolved, FILTER_VALIDATE_IP)) {
                    $ips[] = $resolved;
                }
            }
        }

        return response()->json(array_values(array_unique($ips)));
    }
}
