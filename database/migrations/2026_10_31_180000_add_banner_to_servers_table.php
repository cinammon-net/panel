<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        if (Schema::hasTable('servers') && !Schema::hasColumn('servers', 'banner')) {
            Schema::table('servers', function (Blueprint $table) {
                $table->text('banner')->nullable()->after('image');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('servers') && Schema::hasColumn('servers', 'banner')) {
            Schema::table('servers', function (Blueprint $table) {
                $table->dropColumn('banner');
            });
        }
    }
};

