<?php

// Run only inside the isolated local environment, after migrations.
use App\Models\Node;
use App\Models\User;
use Illuminate\Contracts\Console\Kernel;
use Illuminate\Support\Str;

require __DIR__.'/../vendor/autoload.php';
$app = require __DIR__.'/../bootstrap/app.php';
$app->make(Kernel::class)->bootstrap();
if (!app()->environment('local') || config('app.url') !== 'http://localhost:8000') {
    throw new RuntimeException('This setup is restricted to the local panel.');
}

$user = User::where('email', 'admin@cinammon.local')->first();
if (!$user) {
    $password = Str::random(24);
    $user = User::create(['name' => 'Local Admin', 'email' => 'admin@cinammon.local', 'password' => $password]);
    $user->forceFill(['email_verified_at' => now()])->save();
    file_put_contents(__DIR__.'/admin.credentials', "URL: http://localhost:8000/login\nEmail: admin@cinammon.local\nPassword: {$password}\n");
    chmod(__DIR__.'/admin.credentials', 0600);
}

$user->syncRoles(['Owner']);

$node = Node::firstOrCreate(['name' => 'Local Linux'], [
    'uuid' => (string) Str::uuid(), 'fqdn' => '127.0.0.1', 'scheme' => 'http',
    'daemon_listen' => 8080, 'daemon_sftp' => 2022,
    'daemon_token_id' => (string) Str::uuid(), 'daemon_token' => Str::random(64),
]);
$yaml = (new App\Http\Controllers\NodeController)->configYaml($node->id)->getContent();
file_put_contents(__DIR__.'/config.yml', $yaml);
chmod(__DIR__.'/config.yml', 0600);
echo "Local account and node ready. Credentials are in local/admin.credentials.\n";
