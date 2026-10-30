<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

class RemoteController extends Controller
{
    public function servers(Request $request)
    {
        // Aquí devuelves los servidores (debes crear el modelo o adaptar)
        // Por ahora devuelvo ejemplo vacío válido para Wings:

        return response()->json([
            'data' => [],  // lista de servidores que tengas
            'meta' => [
                'pagination' => [
                    'total' => 0,
                    'count' => 0,
                    'per_page' => 50,
                    'current_page' => 1,
                    'total_pages' => 0,
                ],
            ],
        ]);
    }
}