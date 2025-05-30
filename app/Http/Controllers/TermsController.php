<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

class TermsController extends Controller
{
    public function show()
    {
        return view('legal.accept-terms');
    }

    public function accept(Request $request)
    {
        $user = $request->user();
        $user->terms_accepted_at = now();
        $user->save();

        return redirect()->intended('/');
    }
}
