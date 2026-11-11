<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('tickets', function (Blueprint $table) {
            if (! Schema::hasColumn('tickets', 'category')) {
                $table->string('category', 30)->nullable()->after('status');
            }
            if (! Schema::hasColumn('tickets', 'server_id')) {
                $table->unsignedBigInteger('server_id')->nullable()->after('category');
            }
            if (! Schema::hasColumn('tickets', 'claimed_by')) {
                $table->string('claimed_by', 100)->nullable()->after('server_id');
            }
            if (! Schema::hasColumn('tickets', 'rating')) {
                $table->unsignedTinyInteger('rating')->nullable()->after('claimed_by');
            }
        });
    }

    public function down(): void
    {
        Schema::table('tickets', function (Blueprint $table) {
            foreach (['category', 'server_id', 'claimed_by', 'rating'] as $c) {
                if (Schema::hasColumn('tickets', $c)) {
                    $table->dropColumn($c);
                }
            }
        });
    }
};
