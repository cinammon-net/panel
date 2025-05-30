<?php

namespace Database\Seeders;

use App\Models\Role;
use Illuminate\Database\Seeder;


class DatabaseSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $this->call(EggSeeder::class);
        $this->call(RolePermissionSeeder::class);
    }
}
