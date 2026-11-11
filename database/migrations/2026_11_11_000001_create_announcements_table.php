<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('announcements', function (Blueprint $table) {
            $table->id();
            // offer (oferta), new (novedad), event (evento), news (noticia)
            $table->string('type', 20)->default('offer');
            $table->string('title', 120);
            $table->text('message')->nullable();
            // Reclamo visual corto: "-30%", "GRATIS", "2x1"...
            $table->string('highlight', 20)->nullable();
            $table->string('coupon_code', 40)->nullable();
            $table->string('cta_label', 40)->nullable();
            $table->string('cta_url', 500)->nullable();
            // Dónde se muestra: web (landing), panel, store
            $table->json('places');
            // En la landing, además de la barra, abre una ventana emergente.
            $table->boolean('popup')->default(false);
            $table->boolean('enabled')->default(true);
            $table->timestamp('starts_at');
            $table->timestamp('ends_at')->nullable();
            $table->unsignedInteger('clicks')->default(0);
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->index(['enabled', 'starts_at', 'ends_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('announcements');
    }
};
