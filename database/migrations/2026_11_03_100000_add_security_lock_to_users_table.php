<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('lock_code')->nullable();
            $table->timestamp('lock_code_set_at')->nullable();
            $table->timestamp('lock_enabled_until')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['lock_code', 'lock_code_set_at', 'lock_enabled_until']);
        });
    }
};
