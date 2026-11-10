<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Cuentas de Cloudflare que conecta cada cliente (token de API propio, guardado cifrado).
        if (! Schema::hasTable('cloudflare_connections')) {
            Schema::create('cloudflare_connections', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('user_id')->unique();
                $table->text('token');
                $table->string('token_hint', 12)->nullable();
                $table->unsignedInteger('zones_count')->default(0);
                $table->timestamp('verified_at')->nullable();
                $table->timestamps();
            });
        }

        // Dominios propios de los servidores (antes eran subdominios falsos guardados en la caché).
        if (! Schema::hasTable('server_subdomains')) {
            Schema::create('server_subdomains', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('server_id')->index();
                $table->string('domain', 253)->unique();
                // cloudflare: registros creados por el panel en la zona del cliente | manual: los crea el cliente
                $table->string('provider', 12);
                // game: nube gris hacia el nodo (+ SRV en Minecraft Java) | web: con proxy hacia la web
                $table->string('kind', 10);
                $table->string('status', 12)->default('pending');
                $table->string('zone_id', 64)->nullable();
                $table->string('zone_name', 253)->nullable();
                $table->unsignedInteger('port')->nullable();
                // Registros DNS creados en Cloudflare (id, tipo, nombre) para poder borrarlos o actualizarlos
                $table->json('records')->nullable();
                $table->string('last_error', 255)->nullable();
                $table->timestamp('verified_at')->nullable();
                $table->unsignedBigInteger('created_by')->nullable();
                $table->timestamps();
            });
        }

        // Servidores de la tienda: si se pagaron con dinero (los gratuitos con monedas no tienen dominio propio).
        if (! Schema::hasColumn('servers', 'billing_paid')) {
            Schema::table('servers', function (Blueprint $table) {
                $table->boolean('billing_paid')->nullable()->after('external_id');
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('server_subdomains');
        Schema::dropIfExists('cloudflare_connections');
        if (Schema::hasColumn('servers', 'billing_paid')) {
            Schema::table('servers', fn (Blueprint $table) => $table->dropColumn('billing_paid'));
        }
    }
};
