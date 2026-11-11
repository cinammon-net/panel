<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('social_provider_settings')) {
            Schema::create('social_provider_settings', function (Blueprint $table) {
                $table->id();
                $table->string('provider')->unique();
                $table->boolean('enabled')->default(false);
                $table->text('client_id')->nullable();
                $table->text('client_secret')->nullable();
                $table->string('tenant')->nullable();
                $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
                $table->timestamps();
            });
        }

        Schema::table('users', function (Blueprint $table) {
            if (! Schema::hasColumn('users', 'cloudflare_id')) {
                $table->string('cloudflare_id')->nullable()->unique();
            }
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('social_provider_settings');

        Schema::table('users', function (Blueprint $table) {
            if (Schema::hasColumn('users', 'cloudflare_id')) {
                $table->dropUnique(['cloudflare_id']);
                $table->dropColumn('cloudflare_id');
            }
        });
    }
};
