<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('eggs', function (Blueprint $table) {
            $table->boolean('force_outgoing_ip')->nullable()->default(false)->change();
        });
    }

    public function down(): void
    {
        Schema::table('eggs', function (Blueprint $table) {
            $table->boolean('force_outgoing_ip')->default(false)->change();
        });
    }
};
