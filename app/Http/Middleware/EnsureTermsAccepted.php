<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class EnsureTermsAccepted
{
    public function handle(Request $request, Closure $next)
    {
        if ($request->user() && !$request->user()->terms_accepted_at) {
            return redirect()->route('terms.accept');
        }

        return $next($request);
    }
}
