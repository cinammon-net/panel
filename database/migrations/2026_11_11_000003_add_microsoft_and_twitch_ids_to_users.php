<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (! Schema::hasColumn('users', 'microsoft_id')) {
                $table->string('microsoft_id')->nullable()->unique();
            }
            if (! Schema::hasColumn('users', 'twitch_id')) {
                $table->string('twitch_id')->nullable()->unique();
            }
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropUnique(['microsoft_id']);
            $table->dropUnique(['twitch_id']);
            $table->dropColumn(['microsoft_id', 'twitch_id']);
        });
    }
};
