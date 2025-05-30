<?php

namespace App\Http\Controllers;

use App\Models\EggVariable;
use Illuminate\Http\Request;

class EggVariableController extends Controller
{
    // Método para borrar una variable por ID
    public function destroy($id)
    {
        $variable = EggVariable::findOrFail($id);
        $variable->delete();

        return redirect()->back()->with('success', 'Variable eliminada correctamente.');
    }
}
